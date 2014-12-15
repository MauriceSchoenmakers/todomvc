
Learnings / TODO:
=================

level 1:
--------
GOOD

- we could quite easy set up the loop add more and more features 
- the benchmark should it is promising to proceed. 
  - where to look for gains...(dom writing, flame graph)


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
