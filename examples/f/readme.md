f architecture experiments
==========================

We want to create a small ui architecture prototype that uses a single paradigm of asynchronic pipelines

  *  browser -> backend
  *  browser <- backend
  
and see how far we get


````

       /- - ->events- - ->routing- - ->back end operations- --\
      /                                                        V
dom/browser (state)                                            |    optional server/backends (state)                                                        |        (state)
     A                                                        /
      \- - -dom ops<- - -routing<- - - events<- - - - - - -  /

````

The building blocks are ordered sets of simple message passing functions:

````
function(m){
	/* new message m */; 
	return (m); // or do not return to stop the processing
}
````


Roadmap
=======
First want to implement all todomvc features without using any external library and pass all browser-tests

level 1: dom only, no back end (done)
-----------------
What we have now implemented, in a first attempt as a proof of concept, are two pipelines, linked together without an intermediate backend. Here *only* the dom keeps state and the backend operations are just passed around. Thus in fact are not really needed at all to make a working system. 

level >1: dom + backends
------------------
To proof the flexibility we try to insert different backends  p.e. adding 
 
 *  an indexDB backend 
 *  a server side backend rest backend
 *  a web socket based backend


level subset: dom is subset of backend (1 0000 000 todos)
----------------------
Many ui side javascript frameworks do not really scale well. So how could we handle *1 0000 000* todos ?
In this case the dom state can store only a limited set of todo items. 
We will implement an endless scrolling list by reusing a limited set of dom elements and just rotate and reuse these. The complete (virtual) list must thus be in an abstract backend.

We can also investigate the influence of a virtual dom tree compared to simply collect the dom operations from the rendering pipeline and apply them at the animation frame request. 



Advantages
==========
What we hope to achieve and why

*  better composability, reusability, flexibility, testability, scalability: because we use just a single conceptual simple pipeline as system construction paradigm
*  better maintainability: with less code & dependencies
*  lower learning curve: because you need to learn just one concept
*  improved performance: by using less moving parts

Can we measure this, could we make experiments that prove this...?

A first benchmark with https://github.com/MauriceSchoenmakers/todomvc-perf.git
reveals our approach is not sooo bad, adding 5000 items.
````
2 runs average:
{
    "Backbone": 1503263.7014999054,
    "Mercury (thunks)": 9745.703499764204,
    "Mithril": 7168.190999771468,
    "f": 88826.65850000922
}
````
Look for the real dom updating just on raf? Take a look on flame
graphs...



Learnings / TODO:
=================

level 1:
--------
GOOD

- we could quite easy set up the loop add more and more features 
- the benchmark should it is promising to proceed. 
- 	where to look for gains...
	

MISSING MVC

- for a hammer everything is a nail. so everything is a pipeline. Negative effects:
  - different aspects: like derived data counts and view render logic appears 
    - in a single pipeline
    - or are separated over multiple pipelines :/
      - this is the result of mapping everything in a single pipeline
      - could be solved by splitting pipelines (tried this for counting but became also complex) 
      - injecting features into pipelines as a way of pipeline composition
        -> this could also improve testability of each feature
  - some stuff was added at the end like stats/footer rendering and filtering todos
    - so it was done for each action even if 'model' didn't change


SURPRISES

- actions like delete all and mark all as completed are not implemented as first expected using the 'single' operations. 
  - maybe good for a shared backend ? but still..
- especially stat counting was not so nice: adding to each action involved. Like a constraint solver. one action changes a variable, you must calc the others... 
  - in mvc: model changed, calc all vars.
  - some use intelligent calcs/templates: if a value retrieved before changes -> rerender/calc
  - choose to calc count as ++ and -- and did not really derive it from the list of todos but counted in parallel. 
  - in a distributed shared model, the counts should come from the backend...
  
- dom state had to be queried once: on delete. was the item completed y/n, update stats
- pipeline or takes the first match but, if we want to continue we must add an always match...


MAINTAINABILITY

- making in/out message properties per function much more obvious 
  - as input for an early return if precondition in properties do not exist
- routing using just with overlaping regexps is order dependend. so todos/completed conflicts with todos/:id so we put todos/completed first. 
  - same as in express, maybe use a trie based routing

TESTING

- missed opportunities: doing test driven development for each feature and *keep it separate in code* not just meld it into the app 
  - maybe a new experiment and redo it with pipeline injection...
  - then we can not only add features step by step but can also switch of features and keep the result clean 
  - composition is thus about pipeline composition wich is then not concat but injection
  - we could also automatically check for feature interaction in case of an error ?
- used the browser-tests of todomvc at the end 
  - just before the stats where finished
  - missed a corner case (empty text==delete)

DEBUGGING

- added a minimum log at the start, but it actually just helped in a few cases. most of the time stuff just worked or where broken and a debugger was used ...
- often error broke the main loop, thus nothing worked. is this good: break early? or bad.. 
- errors and fixes were always local where changed.. no big side effects
- better support a debug function recognised in the or/and pipeline

OTHER

- missing uniform configuration, now just function parameters, use objects as named params
- refactor some more selector stuff in helpers
- 'template' could include hide/toggle logic... we did sometimes toggle extra and then add render later on..
- the pipelines are somewhat too simplistic, support callbacks and debug
- use immutable messages, of course that is what we want..., 
  - should be easy watch effect on performance...

NEXT

- think about reliable convergent state (like in swarm.js)
- think about virtual dom like effect, raf support...


MVC?
====


The following image depicts a typical model view controller structure:


````
   /--->events—>routing- - ->controller  - - - \              /- - ->adapter - -> calls - -\   
  /                           (maybe state)     V            /                              V
dom/browser (state)                                 model (state)              optional server/backends (state)
  A                                              ||          A                              /
   \- - -dom ops<— —multiple views (states)* <=  //           \- - -adapter< - -responses -/
````

Sometimes a view and a controller are merged into one component.


Its obviously that the model view controller approach has multiple objects with state: model, view, dom, optional backends, and these states are kept in sync in different ways: There is an event mapping to controller functions. These functions handle model objects and are calling backends. Backends are called using async server calls and their results are merged back into models. The model changes trigger multiple listeners, which in turn are functions of views who update their state by asking the model for data. This view state is then finally mapped to a dom state update during rendering by calling dom changing functions.

Using a virtual-dom changes a bit in the model: It always re-renders the dom tree top down and when ever the browser has time it applies a diff, formed from all patches until then. This decouples dom updates from single view produced updates, it enforces a simple pull model of view state. The view can now no longer do a dom change, request dom values and thereby enforce a slow dom relayout, and then do another dom change based on the requested values.


````
       /--->events—>routing- - ->controller  - - - \              /- - ->adapter - -> calls - -\
      /                           (maybe state)     V            /                              V
dom/browser (state)                                 model (state)                             optional server/backends (state)
  | request   A                                       ||        A                              /
  | animation | apply diff                            ||         \- - -adapter< - -responses -/
  V frame     |                                       ||
 virtual dom patches                                 //
     \\                                             // listener
      \\ = = render => multiple views (states)* <==//
````



MVC as a pattern tries to make it easier to model the system state by a coarse state separation in model and views. However the multiple control flows and underspecified messaging semantics make every implementation more or less unique. Especially when a framework handles all these communications and its corner cases then specific code in models, views are tied to that framework and it concepts. This reduces reusability and composability.

We argue that what finally is important is only an always correct dom state, after an sequence of input events from the outside : the user or backend/systems.

All intermediate state representations are just helpers and optional. To reduce overall complexity it is crucial to have a simple uniform control flow and to reduce the number of state representations.

Our streaming approach is more about transforming input messages to output messages, in a side effect free transition in multiple isolated steps. The emphasis lies on the (functional) transformation steps, not on the (object) state modelling.
