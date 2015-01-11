'use strict';

// QUERY
// on the first dom query we create a clone of the body if not already done...

/*var new_focus_id = function F(){
	return (F.id = F.id ? ++F.id : 1 );
};*/

var dom = {
	value : function(el,v){
	         if (el.type === 'checkbox'){ el.checked   = !!v; }
		else if ('value'   in el       ){ el.value     = v;   }
		else                            { el.innerHTML = v;   }
	},
	
	/*
	clone : null, // cloned dom body in a fragment
	body : function(){
		var self=this;
		if(!self.clone){
			self.clone = document.createDocumentFragment();
			var focus_el = document.activeElement;
			var focus_id = focus_el.id || (focus_el.id='focus_'+new_focus_id()); // store focus id before cloning
			self.clone.appendChild(document.body.cloneNode(true));
			window.requestAnimationFrame(function(){
				if(self.clone){
					document.body=self.clone.childNodes[0];
					var new_focus_el = document.getElementById(focus_id);
					if(new_focus_el) new_focus_el.focus();
					self.clone=null;
				}
			});
		}
		return this.clone;
	},
	*/
	
	query : function(selector,context){
		context = context || document; //.this.body();
		return context.querySelectorAll(selector);
	},
	
	query1 : function(selector,context){
		context = context || document; // this.body();
		return context.querySelector(selector);
	}
};

// TEMPLATING ENGINE
dom.render = function(root,n,v,id){
	var els = dom.query('[data='+n+']',root);
	for (var i = 0, l = els.length; i<l; ++i) {
		var el=els[i];
		if (id) el.setAttribute('data-id',id);
		
		if ('id'===n) continue;
		
		dom.value(el,v);
		
		if (id) el.setAttribute('data-id',id);
	}
};

// ID GENERATOR
var new_id = function F(){
	return (F.id = F.id ? ++F.id : 1 );
};

// PARSE QUERY STRING
var url = {
	decode : function (s) { return decodeURIComponent(s.replace('+',' ')); }
};
url.query = function(m){
	var
		u  = m.url,
		qi = u ? u.indexOf('?') : -1,
		q  = ~qi ? u.substring(qi+1) : null;
	
	if(!q) return m;
	
	var query = (m.query = {}), decode = url.decode;
	q.replace(/([^&=]+)=?([^&]*)/g,function(m,n,v){
		query[decode(n)] = decode(v);
	});
	return m;
};


// APPLICATION BUILDING BLOCKS
var todo = {
	
	frontend : {
		
		select : function(selector){
			return  function(m){ var e = m.event, v = e ? e.target : null; if(v && v.matches &&v.matches(selector)){ m.element = v; return m;} };
		},
		
		character : {
			enter : function(m){ var e = m.event, v= (e.type==='keydown' ? e.keyCode : null); if( v && v===13 ) return m; },
			escape: function(m){ var e = m.event, v= (e.type==='keydown' ? e.keyCode : null); if( v && v===27 ) return m; }
		},
		
		type : function(type){
			return function(m){ var e = m.event; if( e && e.type === type ) return m; };
		},
		
		element: {
			value : {
				get   : function(m){
					if (!m.element) return m;
					var el = m.element; m.value = (el.type === 'checkbox' ? el.checked : el.value);
					return m;
				},
				trim  : function(m){ var v = m.value; if (v) m.value = v.replace(/^\s+/,'').replace(/\s+$/,''); return m; },
				reset : function(m){ var el = m.element; if (el) el.value = ''; return m; },
				set   : function(element,prop){
					var set_value=function(v){ return function(el){ dom.value(el,v); }; };
					return function(m){
						if(!m[element] || !(prop in m) ) return m;
						var el=m[element],f=set_value(m[prop]);
						if(el.item) Array.prototype.forEach.call(el,f); else f(el);
						return m;
					};
				}
			},
			
			data_id : {
				get      : function(m){ var v = m.element ? m.element.getAttribute('data-id') : null; if(v) { m.id = v; return m; } }
			},
			
			toggle : function(element,prop,name,inverse){
				var
					l=name.length,
					toggle_class = function(set,el){
						var cl=(el.className||''), i=cl.indexOf(name);
						     if ( set && !~i) el.className = (cl ? cl+' '+name : name );
						else if (!set &&  ~i) el.className = cl.substring(0,i)+cl.substring(i+l);
					},
					add_class    = toggle_class.bind(null,!inverse), // flip meaning based on inverse
					remove_class = toggle_class.bind(null,!!inverse);
				
				return function(m){
					if(!m[element] || (!(prop in m) && prop!==true && prop!==false)) return m;
					var set = typeof(prop)==='string'? m[prop] : prop;
					var f = set ? add_class : remove_class, el=m[element];
					if(el.item) Array.prototype.forEach.call(el,f); else f(el);
					return m;
				};
			},
			
			remove: function(element){
				var f=function(el){ el.remove(); };
				return function(m){
					if(!m[element]) return m;
					var el=m[element];
					if(el.item) Array.prototype.forEach.call(el,f); else f(el);
					return m;
				};
			},
			
			focus:function(element){
				return function(m){
					if(!m[element]) return m;
					m[element].focus();
					return m;
				};
			},
			
			find: function(element,selector,context){
				element = element || 'element';
				return function(m){
					var c = context ? m[context] : null;
					m[element] = dom.query(selector,c);
					return m;
				};
			},
			find1: function(element,selector,context){
				element = element || 'element';
				return function(m){
					var c = context ? m[context] : null;
					m[element] = dom.query1(selector,c);
					return m;
				};
			}
		},
		
		list : function(m){ m.list = dom.query1('#todo-list'); if(m.list) return m; },
		
		item : {
			select : {
				editing : function(m){ if(m.item && m.item.matches && m.item.matches('.editing')) return m;}
			},
			
			find : {
				id:        function(m){ if(!m.id) return m; m.item = dom.query1('#todo-list li[data-id="'+m.id+'"]'); return m; },
				completed: function(m){ m.items = dom.query('#todo-list li.completed'); return m; },
				active:    function(m){ m.items = dom.query('#todo-list li:not(.completed)'); return m; },
				all:       function(m){ m.items = dom.query('#todo-list li'                ); return m; },
			},
			
			template : {
				create: function(m){
					var t = dom.query1('#item-template'), content = t ? t.content : null;
					m.item =  content ? content.cloneNode(true) : null;
					if(m.item) return m; },
				
				render: function(m){ // title from body to template
					var root = m.item;
					if (!root) return m;
					var op = m.operation, body = op ? op.body : null, id = body ? body.id : null;
					if (!body) return m;
					for (var p in body) dom.render(root, p, body[p], id);
					return m;
				}
			},
			add : function(m){
				if( !m.list || !m.item) return m;
				     if( m.before ) m.list.insertBefore(m.item,m.before);
				else if( m.replace) m.list.replaceChild(m.item,m.replace);
				else m.list.appendChild(m.item);
				return m;
			}
		},
		
		footer : {
			render : function(m){
				var root = m.footer;
				if (!root) return m;
				var data = m.data;
				if (!data) return m;
				for (var p in data) dom.render(root, p, data[p]);
				return m;
			}
		}
	},
	
	backend : {
		
		list: {
			count: 0,
			completed: 0
		},
		
		select : {
			
			url : function(u,map){
				return (typeof(u)==='string' ?
					function(m){ var v=m.operation ? m.operation.url : null; if(v && v.substring(0,u.length)===u){ m.url=v; return m;} } :
					function(m){
						var v = m.operation ? m.operation.url : null, match = v ? u.exec(v) : null;
						if(!match) return;
						m.url=v;
						if(!map) return m;
						for(var i=0,l=map.length;i<l;++i){
							var g=match[i+1];
							if(g) m[map[i]]=g;
						}
						return m;
					});
			},
			
			post  : function(m){ var v=m.operation ? m.operation.method : null; if(v && v === 'post'  ) return m; },
			get   : function(m){ var v=m.operation ? m.operation.method : null; if(v && v === 'get'   ) return m; },
			put   : function(m){ var v=m.operation ? m.operation.method : null; if(v && v === 'put'   ) return m; },
			delete: function(m){ var v=m.operation ? m.operation.method : null; if(v && v === 'delete') return m; }
		},
		
		operation: {
			
			post: function(m){
				if (!m.value) return m;
				m.operation = { method: 'post', url: '/todos', body: { title: m.value, completed:false } };
				m.properties.operation=true;
				return m;
			},
			
			add_id: function F(m){
				if (!m.operation) return m;
				var op = m.operation, body = op ? op.body : null, id = body ? body.id : void 0;
				if (id === void 0) id = (body.id = new_id());
				if (id !== void 0) m.id = id;
				return m;
			},
			
			completed: function(m){
				var op = m.operation, body = op ? op.body : null, completed = body ? body.completed : void 0;
				if (completed !== void 0) m.completed = completed;
				return m;
			},
			
			title: function(m){
				var op = m.operation, body = op ? op.body : null, title = body ? body.title : void 0;
				if (title !== void 0) m.title = title;
				return m;
			},
			
			put: {
				completed: function(m){
					if(!m.id || !('value' in m) ) return m;
					m.operation = { method: 'put', url: '/todos/'+encodeURI(m.id)+'/completed', body: { id: m.id, completed: m.value } };
					m.properties.operation=true;
					return m;
				},
				
				all_completed: function(m){
					if( !('value' in m) ) return m;
					m.operation = { method: 'put', url: '/todos/completed', body: { completed: m.value } };
					m.properties.operation=true;
					return m;
				},
				
				title: function(m){
					if(!m.id || !('value' in m) ) return m;
					m.operation = { method: 'put', url: '/todos/'+encodeURI(m.id)+'/title', body: { id: m.id, title: m.value } };
					m.properties.operation=true;
					return m;
				},
				
				filter: function(m){
					m.operation = { method: 'put', url: '/todos', body : { filter: m.filter } };
					m.properties.operation=true;
					return m;
				}
			},
			
			delete: function(m){
				if (!m.id) return m;
				m.operation = { method: 'delete', url: '/todos/'+encodeURI(m.id) };
				m.properties.operation=true;
				return m;
			},
			
			delete_completed: function(m){
				m.operation = { method: 'delete', url: '/todos/completed' };
				m.properties.operation=true;
				return m;
			},
			
			get: {
				all : function(m){
					if(!('from' in m) && !('to' in m) ) return m;
					m.operation = { method: 'get', url:
						(
							'/todos/'+
							('filter' in m ? encodeURI(m.filter) : '' )
							+'?' +
							('from' in m ? '&from='+encodeURI(m.from) : '') +
							('to'   in m ? '&to='+encodeURI(m.to)     : '') +
							'&limit='+ ( m.limit ||  3  )
						).replace('?&','?')
					};
					m.properties.operation=true;
					return m;
				}
			}
		}
	}
};

todo.backend.list.data = function(m){
	m.data = {};
	m.data.count           = todo.backend.list.count;
	m.data.completed       = todo.backend.list.completed;
	m.data.active          = m.data.count - m.data.completed;
	m.data['active-plural']= m.data.active === 1 ? '':'s';
	return m;
};

todo.frontend.filter = {
	value : '',
	inject : function(m){
		m.filter = todo.frontend.filter.value;
		return m;
	},
	extract : function(m){
		if(todo.frontend.filter.value !== m.filter){
			todo.frontend.filter.value = m.filter;
			return m;
		}
	},
	select : {
		all       : function(m){ if(m.filter===''         ) return m; },
		active    : function(m){ if(m.filter==='active'   ) return m; },
		completed : function(m){ if(m.filter==='completed') return m; }
	},
	
	find : function(m){ m.element = dom.query1('#filters li a[href="#/'+m.filter+'"]'); return m; }
};
// init filter
location.href = location.pathname+'#/'+todo.frontend.filter.value;


// SCROLL
todo.frontend.scroll = {
	
	initialize: true,
	position  : 0,
	
	item : {
		first : {
			get : function(m){ if(!m.list) return; m.first = m.list.firstElementChild; return m;},
			select : {
				inside  :function(m){ if(!m.first) return; var rect = m.first.getBoundingClientRect(); if(rect && rect.top    >  0) return m; },
				outside :function(m){ if(!m.first) return; var rect = m.first.getBoundingClientRect(); if(rect && rect.bottom <= 0) return m; }
			},
			db : {
				select: function(m){ // set a flag to call db if not already done
					if(!m.first) return;
					var cl = m.first.className; if(cl && ~cl.indexOf('first-db-called') ) return;
					m.first.className = ( cl ? cl + ' ' : '' ) +'first-db-called';
					return m;
				},
				reset: function(m){ // reset the flag if db result found
					if(!m.first) return m;
					var cl = m.first.className; if(!cl) return m;
					m.first.className = cl.replace(/(^|\s+)first\-db\-called/,'');
					return m;
				},
				to :function(m){ if(!m.first) return m; m.to = m.first.getAttribute('data-id'); return m; }
			}
		},
		last : {
			get : function(m){ if(!m.list) return; m.last  = m.list.lastElementChild;  return m;},
			select : {
				inside  : function(m){ if(!m.last) return; var rect = m.last.getBoundingClientRect(); if(rect && rect.bottom <  window.innerHeight ) return m; },
				outside : function(m){ if(!m.last) return; var rect = m.last.getBoundingClientRect(); if(rect && rect.top    >= window.innerHeight ) return m; }
			},
			db : {
				select: function(m){ // set a flag to call db if not already done
					if(!m.last) return;
					var cl = m.last.className; if(cl && ~cl.indexOf('last-db-called') ) return;
					m.last.className = ( cl ? cl + ' ' : '' ) +'last-db-called';
					return m;
				},
				selected : function(m){ if(!m.last) return; var cl = m.last.className; if(cl && ~cl.indexOf('last-db-called') ) return m; },
				reset: function(m){ // reset the flag if db result found
					if(!m.last) return m;
					var cl = m.last.className; if(!cl) return m;
					m.last.className = cl.replace(/(^|\s+)last\-db\-called/,'');
					return m;
				},
				from :function(m){ if(!m.last) return m; m.from = m.last.getAttribute('data-id'); return m; }
			}
		},
		insert : function(m){
			if(!m.list || !m.id) return m;
			var id = parseInt(m.id), cs = m.list.children;
			for(var i=0,l=cs.length;i<l;i++){
				var c=cs[i], c_id=c.getAttribute('data-id');
				if(c_id) c_id = parseInt(c_id);
				if (c_id === id ){
					m.replace = c;
					return m; // no insert
				} else if(c_id > id){
					m.before = c;
					break;
				} else {
					m.after = c;
				}
			}
			return m;
		}
	}
};

(function(scroll){
	todo.frontend.scroll.select = {
		init : function(m){
			if(scroll.initialize){
				scroll.initialize = false;
				m.position = scroll.position;
				return m;
			}
		},
		reinit : function(m){
			scroll.initialize = true;
			scroll.position = m.position;
			return m;
		}
	};
})(todo.frontend.scroll);

// FRAMEWORK
var pipeline = {
	debug : function(msg,debug){ var f = function(m){ console.log(msg + ':' + m ); if(debug) debugger; }; f.debug=true; return f;},
	
	call: function (and,array){
		var self=this;
		
		return function(m,cb){
			m = m || {};
			
			if(m.error){ cb && cb(m.error,m); return; }
			
			var l=array.length;
			
			(function next(i,mx){
				if(i>=l){ cb && cb(null,mx); return; }
				
				var f=array[i++];
				
				if(!f) debugger;
				
				if(f.debug){ f(mx); next(i,mx); return; }
				
				if(f.length===1) f = (function(ff){ return function(mf,cbf){ mf=ff(mf); cbf(null,mf); }; })(f);
				
				try {
					f(mx,function(err,mr){
						if(err && !(mr && mr.error)){
							mr = mr || {};
							mr.error = err;
						}
						// or returns undefined if it doesn't match, try next with original m unless at the end
						if( (and ? mr !== void 0 : mr === void 0) && !(mr && mr.error) ) next(i, and ? mr : (i<l ? m : void 0) );
						else cb && cb( mr ? mr.error : null, mr);
					});
				} catch(err) {
					console.log(err);
					console.log(err.stack);
					mx.error = err;
					cb && cb(mx.error,mx);
				}
			})(0,m);
		};
	}
};

pipeline.and = pipeline.call.bind(pipeline,true);
pipeline.or  = pipeline.call.bind(pipeline,false);

var ui = todo.frontend;
var db = todo.backend;

// APPLICATION LOGIC

// REACTING ON USER INPUT
ui.pipeline = {
	
	create : pipeline.and([
		ui.select('#new-todo'),
		ui.character.enter,
		ui.element.value.get,
		ui.element.value.trim,
		db.operation.post,
		ui.element.value.reset,
		events.frontend.log
	]),
	
	completed : pipeline.and([
		ui.type('click'),
		ui.select('.toggle'),
		ui.element.value.get,
		ui.element.data_id.get,
		db.operation.put.completed,
		events.frontend.log
	]),
	
	all_completed : pipeline.and([
		ui.type('click'),
		ui.select('#toggle-all'),
		ui.element.value.get,
		db.operation.put.all_completed,
		events.frontend.log
	]),
	
	destroy : pipeline.and([
		ui.type('click'),
		ui.select('.destroy'),
		ui.element.data_id.get,
		db.operation.delete,
		events.frontend.log
	]),
	
	destroy_completed : pipeline.and([
		ui.type('click'),
		ui.select('#clear-completed'),
		db.operation.delete_completed,
		events.frontend.log
	]),
	
	edit : {
		begin : pipeline.and([
			ui.select('label'),
			ui.type('dblclick'),
			ui.element.data_id.get,
			ui.item.find.id,
			ui.element.toggle('item',true,'editing'),
			ui.element.find1('input','.edit','item'),
			ui.element.focus('input'),
			function(m){ if(!m.input || !m.input.value ) return m; m.input.__value = m.input.value; return m; },
			events.frontend.log
		]),
		
		commit : pipeline.and([
			ui.select('.edit'),
			pipeline.or([
				ui.character.enter,
				ui.type('blur')
			]),
			ui.element.data_id.get,
			ui.item.find.id,
			ui.item.select.editing,
			ui.element.toggle('item',false,'editing'),
			ui.element.value.get,
			ui.element.value.trim,
			pipeline.or([
				pipeline.and([
					function(m){if(m.value) return m;},
					db.operation.put.title
				]),
				db.operation.delete
			]),
			events.frontend.log
		]),
		
		abort: pipeline.and([
			ui.select('.edit'),
			ui.character.escape,
			ui.element.data_id.get,
			ui.item.find.id,
			ui.element.toggle('item',false,'editing'),
			ui.element.find1('input','.edit','item'),
			function(m){ if(!m.input || !m.input.__value) return m; m.input.value = m.input.__value; return m; },
			events.frontend.log
		])
	},
	
	filter: pipeline.and([
		ui.type('hashchange'),
		function(m){ if(location.hash) m.filter = location.hash.substring(2); return m; },
		ui.filter.extract,
		db.operation.put.filter,
	]),
	
	paint: pipeline.and([
		ui.type('paint'),
		/*function F(m){
			if (F.lastPosition === window.pageYOffset) {
				return;
			}
			F.lastPosition = window.pageYOffset;
			return m;
		},
		*/
		pipeline.or([
			pipeline.and([
				ui.scroll.select.init,
				function(m,cb){ // we split up the event in two (subsequent) events, (we call the cb twice)
					var m_down={},m_up={};
					for(var p in m){ m_down[p]=m[p]; m_up[p]=m[p]; }
					
					pipeline.and([
						function(m){m.from=m.position;return m;},
						db.operation.get.all
					])(m_down,cb);
					
					pipeline.and([
						function(m){m.to=m.position;return m;},
						db.operation.get.all
					])(m_up,cb);
				}
			]),
			pipeline.or([
				function(m,cb){ // we split up the event in two (subsequent) events, (we call the cb twice)
					var m_down={},m_up={};
					for(var p in m){ m_down[p]=m[p]; m_up[p]=m[p]; }
					
					// SCROLL DOWN
					var  p_down = pipeline.and([
						ui.list,
						ui.scroll.item.last.get,
						ui.scroll.item.last.select.inside,
						//function(m){ if(!m.last) debugger; m.last.style.backgroundColor='red'; return m; },
						ui.scroll.item.last.db.select,
						ui.scroll.item.last.db.from,
						db.operation.get.all
					])(m_down,cb);
					
					// SCROLL UP
					var p_up = pipeline.and([
						ui.list,
						ui.scroll.item.first.get,
						ui.scroll.item.first.select.inside,
						//function(m){ if(!m.first) debugger; m.first.style.backgroundColor='green'; return m; },
						ui.scroll.item.first.db.select,
						ui.scroll.item.first.db.to,
						db.operation.get.all
					])(m_up,cb);
				}
			])
		])
	])
};

// REACTING ON BACKEND INPUT

(function(){

db.pipeline = {
	// if we get a post for the collection we get the item template, render it, add it to the list and finally we log the executed operation
	create : pipeline.and([
		db.select.post,
		db.select.url(/\/todos\/?$/),
		db.operation.add_id,
		
		ui.list,
		
		ui.scroll.item.insert,
		function(m){ if(!m.before) return m; }, // only if it becomes the last item, what is normal if created locally
		
		ui.scroll.item.last.get,
		pipeline.or([
			function(m){ if(!m.last) return m;},
			pipeline.and([
				ui.scroll.item.last.db.selected,   // not just last, but also until now without successor
				ui.scroll.item.last.db.reset,      // new can becomes the new last
				ui.scroll.item.last.select.inside  // only add if visible
			])
		]),
		ui.item.template.create,
		
		ui.item.template.render,
		ui.item.add,
		ui.item.find.id,
		
		db.operation.completed,
		ui.element.toggle('item','completed','completed'),
		
		events.backend.input.log
	]),
	
	update_count : pipeline.and([
		db.select.put,
		db.select.url(/\/todos\/count\/?/),
		
		function(m){ if(!m.operation || !m.operation.body ) return; db.list.count = m.operation.body.count; m.count = db.list.count; return m;},
		function(m){ if(!m.operation || !m.operation.body ) return; db.list.completed = m.operation.body.completed; return m;},
		
		function(m){ m['has-completed'] = (db.list.completed > 0) ; return m;},
		ui.element.find1('clear','#clear-completed'),
		ui.element.toggle('clear','has-completed','hidden',true),
		
		function(m){ m['completed-all'] = db.list.completed===db.list.count  ; return m;},
		ui.element.find1('toggle-all','#toggle-all'),
		ui.element.value.set('toggle-all','completed-all'),
		
		ui.element.find1('footer','#footer'),
		ui.element.toggle('footer','count','hidden',true),
		ui.element.find1('main','#main'),
		ui.element.toggle('main','count','hidden',true),
		
		db.list.data,
		ui.element.find1('footer','#footer'),
		ui.footer.render,
		
		events.backend.input.log,
	]),
	
	update : pipeline.and([
		db.select.put,
		db.select.url(/\/todos\/([^\/]+)$/,['id']),
		
		ui.list,
		
		ui.scroll.item.insert,
		ui.scroll.item.first.get,
		ui.scroll.item.last.get,
		
		pipeline.or([
			pipeline.and([
				function(m){ if( m.last && m.after === m.last ) return m; },
				ui.scroll.item.last.db.reset,
				ui.scroll.item.first.select.outside,
				ui.scroll.item.first.db.reset, // cleanup
				function(m){
					var rect = m.first.getBoundingClientRect();
					window.scrollBy(0,-(rect.bottom - rect.top));
					
					m.item = document.createDocumentFragment(); // use a fragment as render context, otherwise li data-.. is not found
					m.item.appendChild(m.first);
					
					return m;
				}
			]),
			pipeline.and([
				function(m){ if( m.first && m.before === m.first ) return m; },
				ui.scroll.item.first.db.reset,
				ui.scroll.item.last.select.outside,
				ui.scroll.item.last.db.reset, // cleanup
				function(m){
					var rect = m.first.getBoundingClientRect();
					window.scrollBy(0,(rect.bottom - rect.top));
					
					m.item = document.createDocumentFragment(); // use a fragment as render context, otherwise li data-.. is not found
					m.item.appendChild(m.last);
					
					return m;
				}
			]),
			ui.item.template.create
		]),
		
		ui.item.template.render,
		ui.item.add,
		ui.item.find.id,
		
		db.operation.completed,
		ui.element.toggle('item','completed','completed'),
		
		events.backend.input.log
	]),
	
	completed: pipeline.and([
		db.select.put,
		db.select.url(/\/todos\/([^\/]+)\/completed$/,['id']),
		ui.item.find.id,
		
		db.operation.completed,
		ui.element.toggle('item','completed','completed'),
		
		events.backend.input.log
	]),
	
	all_completed: pipeline.and([
		db.select.put,
		db.select.url(/\/todos\/completed$/),
		db.operation.completed,
		ui.element.find('toggles','#todo-list .toggle'),
		ui.element.value.set('toggles','completed'),
		ui.item.find.all,
		ui.element.toggle('items','completed','completed'),
		
		events.backend.input.log
	]),
	
	title: pipeline.and([
		db.select.put,
		db.select.url(/\/todos\/([^\/]+)\/title$/,['id']),
		ui.item.find.id,
		ui.item.template.render,
		
		events.backend.input.log
	]),
	
	delete_completed: pipeline.and([
		db.select.delete,
		db.select.url(/\/todos\/completed$/),
		ui.item.find.completed,
		ui.element.remove('items'),
		
		events.backend.input.log
	]),
	
	delete: pipeline.and([
		db.select.delete,
		db.select.url(/\/todos\/([^\/]+)$/,['id']),
		ui.item.find.id,
		
		ui.element.find1('toggle','input.toggle','item'),
		
		ui.element.remove('item'),
		
		events.backend.input.log
	]),
	/*
	list : pipeline.or([
		pipeline.and([
			ui.element.find1('footer','#footer'),
			ui.element.toggle('footer','count','hidden',true),
			ui.element.find1('main','#main'),
			ui.element.toggle('main','count','hidden',true),
			
			db.list.data,
			ui.element.find1('footer','#footer'),
			ui.footer.render,
			
			events.backend.input.log,
		]),
		function(m){ return m;} // always continue
	]),
	*/
	filter : {
		set: pipeline.and([
			db.select.put,
			db.select.url(/\/todos$/),
			function(m){ m.filter = m.operation.body.filter; return m; },
			
			// adapt filter ui
			ui.element.find('filter-previous-selected','#filters .selected'),
			ui.element.toggle('filter-previous-selected',false,'selected'),
			ui.filter.find,
			ui.element.toggle('element',true,'selected'),
			events.backend.input.log,
		]),
		
		// new scroll reinit after a filter is set
		reinit : pipeline.and([
			ui.list,
			ui.scroll.item.first.get,
			function(m){ // use id of first loaded element inside sroll as new position to begin with
				
				var inside=false;
				
				if(m.first) do {
					inside=ui.scroll.item.first.select.inside(m);
				} while(!inside && (m.first = m.first.nextElementSibling));
				
				m.position = inside && m.first ? m.first.dataset.id : 0;
				
				return m;
			},
			todo.frontend.scroll.select.reinit,
			
			ui.item.find.all, // remove all current elements form the list
			ui.element.remove('items')
		]),
		
		apply : pipeline.or([
			pipeline.and([
				ui.filter.select.all,
				ui.item.find.all,
				ui.element.toggle('items',false,'hidden'),
			]),
			pipeline.and([
				ui.filter.select.completed,
				ui.item.find.active,
				ui.element.toggle('items',true,'hidden'),
				ui.item.find.completed,
				ui.element.toggle('items',false,'hidden'),
			]),
			pipeline.and([
				ui.filter.select.active,
				ui.item.find.active,
				ui.element.toggle('items',false,'hidden'),
				ui.item.find.completed,
				ui.element.toggle('items',true,'hidden')
			]),
			function(m){ return m;} // always continue
		])
	}
};

})();

///////////////////////////////////////////////////////////
// INDEX DB

var once = function(f){
	var called = false;
	return function(){
		if(!called && f){ called = true; return f.apply(this,arguments); }
	};
};
var cbx = function(cb,msg,debug){
	return function(){
		console.log(msg);
		if( debug ) debugger;
		cb.apply(this,arguments);
	};
};

var r_handle = function(r,cb,msg,debug){
	if(!r.onsuccess) r.onsuccess = function(e){ msg+=' request success'                ;cbx(cb,msg,debug)(null,e.target.result); };
	if(!r.onblocked) r.onblocked = function(e){ msg+=' request blocked:'+e.target.error;cbx(cb,msg,debug)(e.target.error,null); };
	if(!r.onerror)   r.onerror   = function(e){ msg+=' request error:'  +e.target.error;cbx(cb,msg,debug)(e.target.error,null); };
};
var tx_handle = function(tx,cb,msg,debug){
	if(!tx.oncomplete) tx.oncomplete = function(e){ cbx(cb,msg+' transaction completed',debug)(null,true); };
	if(!tx.onabort)    tx.onabort    = function(e){ cbx(cb,msg+' transaction abort:'+tx.error,debug)(tx.error,null); };
	if(!tx.onerror)    tx.onerror    = function(e){ cbx(cb,msg+' transaction error:'+tx.error,debug)(tx.error,null); };
};

var transaction=function(type,name,f,debug){
	return function(){ // has arguments (....,cb,tx)
		//debugger;
		var
			self   = this,
			args   = Array.prototype.slice.call(arguments),
			l      = args.length,
			cb     = null,
			tx     = (l > 0 ? args[l-1] : null);
		
		if(tx && typeof(tx)==='function'){
			cb = tx;
			tx = null;
			args[l++]=null;
		} else {
			cb = (l > 1 ? args[l-2] : null);
			if( cb && typeof(cb)!=='function') cb=null;
		}
		
		cb=once(cb);
		if(l>1) args[l-2] = cb;
		
		if(!tx){
			tx = self.db.transaction(['todos'], type );
			tx_handle(tx,cb,name,debug);
			if(l>0) args[l-1]=tx;
		}
		
		return f.apply(self,args);
	};
};
var tx_write = function(name,f,debug){ return transaction.call(this,'readwrite',name,f,debug); };
var tx_read  = function(name,f,debug){ return transaction.call(this,'readonly' ,name,f,debug); };

var store={
	db   : null,
	init : function(cb){
		var self = this;
		if(self.db){ cb(null,self); return; }
		
		cb = once(cb);
		var r = window.indexedDB.open('todos',1);
		r.onupgradeneeded=function(e) {
			var db = e.target.result;
			e.target.transaction.onerror = cb; // A versionchange transaction is started automatically.
			
			if(db.objectStoreNames.contains('todos')) db.deleteObjectStore('todos');
			var objectStore = db.createObjectStore('todos', {keyPath: 'id', autoIncrement:true });
			objectStore.createIndex('completed_id', ['completed','id'], {unique: true, multiEntry:false});
		};
		r.onsuccess = function(e){ self.db = e.target.result; cb(null,self); };
		r_handle(r,cb,'init');
	},
	
	remove:function(cb){
		cb = once(cb);
		var self = this;
		if(self.db)this.db.close();
		
		var r = window.indexedDB.deleteDatabase('todos');
		r.onsuccess = function(e){ cb(null,self);};
		r_handle(r,cb,'remove');
	},
	
	add: tx_write('add',function(todo,cb,tx){
		tx.oncomplete = function(){ cb(null,todo); };
		var
			store = tx.objectStore('todos'),
			r = store.add(todo);
			r.onsuccess = function (e) {
				todo.id = e.target.result;
				store.put(todo); // to update index as id is part of the index
			};
			r_handle(r,cb,'add',true);
	}),
	
	put: tx_write('put', function(todo,cb,tx){
		tx.oncomplete = function(){ cb(null,todo); };
		var
			store = tx.objectStore('todos'),
			r = store.put(todo);
	}),
	
	get: tx_read('get',function(id,cb,tx){
		var todo  = null;
		tx.oncomplete = function(){ cb(null,todo); };
		
		var
			store = tx.objectStore('todos'),
			r = store.get(parseInt(id));
		
		r.onsuccess = function(e) { todo=e.target.result; };
		r_handle(r,cb,'get');
	}),
	
	delete: tx_write('delete',function(id,cb,tx){
		tx.oncomplete = function(){ cb(null,id); };
		var
			store = tx.objectStore('todos'),
			r = store.delete(parseInt(id));
	}),
	
	delete_completed: tx_write('delete completed',function(cb,tx){
		var self=this;
		self.get_all(null,null,-1,'completed',function(err,results){
			if(err||!results){ cb(err,null); return; }
			results(function(value,next,request){
				if(!value || !request || !request.result){ cb(null,true); return; }
				
				var r = request.result.delete();
				r.onsuccess = function(e) { next && next(); };
				r_handle(r,cb,'delete completed');
			});
		},tx);
	}),
	
	all_completed: tx_write('all completed',function(completed,cb,tx){
		var self=this;
		self.get_all(null,null,-1,completed?'active':'completed',function(err,results){
			if(err||!results){ cb(err,null); return; }
			results(function(value,next,request){
				//debugger;
				if(!value || !request || !request.result){ cb(null,true); return; }
				value.completed = completed;
				var r = request.result.update(value);
				r.onsuccess = function(e) { next && next(); };
				r_handle(r,cb,'all completed');
			});
		},tx);
	}),
	
	get_all: tx_read('get all',function(after_id,before_id,limit,filter,cb,tx){           // /todos/all?from=id&limit=20
		
		var direction = !after_id && before_id ? 'prevunique' : 'nextunique';
		
		after_id  = after_id || 0;
		before_id = before_id || Number.MAX_VALUE;
		if(filter==='all') filter = null;
		
		tx.oncomplete = function(){ cb(null,null); };
		
		var
			store = tx.objectStore('todos'),
			index = !filter ? store : store.index('completed_id'),
			lower = !filter ? after_id  : [filter==='completed'?1:0,after_id ],
			upper = !filter ? before_id : [filter==='completed'?1:0,before_id],
			range = window.IDBKeyRange.bound(lower,upper, true, true); // exclude lower/upper
		
		this.index(index,range,direction,function(err,results){
			if(err||!results){ cb(err,null); return; }
			cb(null,function(f){
				results(function(v,next,r){
					if(limit!==-1 && (--limit)===0 ){ f(v,null,r); return; }
					f(v,next,r);
				});
			});
		});
	}),
	
	index:function(index, range, direction, cb){ // loop over an index using a range, we return a function as iterator
		if(!direction) direction = 'nextunique';
		var
			self  = this,
			r     = index.openCursor(range,direction),
			first = true,
			next  = null;
		r.onsuccess = function(e) {
			var request = e.target,
				result = request.result,
				value = result ? result.value : null,
				iterator = function F(new_next){
					next = new_next || next;
					if(result) result.continue();
					else next && next(null,null,request);
				};
			if ( first ){
				first = false;
				cb(null, function (new_next){
					next = new_next || next;
					return next ? next(value,value ? iterator : null, request) : value;
				});
			} else  return next ? next(value,value ? iterator : null, request) : value;
		};
		r_handle(r,cb,'index');
	},
	
	count: tx_read('count',function(cb,tx){
		var
			self   = this,
			store  = tx.objectStore('todos'),
			index  = store.index('completed_id'),
			counts = null;
		
		tx.oncomplete = function(){ cb(null,counts); };
		
		// count all
		var r_count = index.count();
		r_count.onsuccess = function(e){
			var count = r_count.result;
			
			// count completed
			var range = window.IDBKeyRange.bound([1,0],[1,Number.MAX_VALUE]); // include lower/upper
			var r_completed = index.count(range);
			r_completed.onsuccess = function(e){
				var completed = r_completed.result;
				counts = {count:count, completed:completed };
			};
			r_handle(r_completed,cb,'count completed');
		
		};
		r_handle(r_count,cb,'count all');
	})
};
///////////////////////////////////////////////////////////

(function(S){
	
	S.todo = {
		init            : function(m,cb){ S.init(function(err){cb(err,m);}); },
		completed2number: function(m){ var tmp; if((tmp=m)&&(tmp=tmp.operation)&&(tmp=tmp.body)){ tmp.completed = tmp.completed ? 1 : 0; } return m; },
		number2completed: function(m){ var tmp; if((tmp=m)&&(tmp=tmp.operation)&&(tmp=tmp.body)){ tmp.completed = tmp.completed === 1;   } return m; },
		
		post            : function(m,cb){ S.add(m.todo ||m.operation.body,   function(e,todo){ m.todo=todo; if(m.operation && m.operation.body) m.operation.body=todo; cb(e,m); }); },
		put             : function(m,cb){ S.put(m.todo ||m.operation.body,   function(e,todo){ m.todo=todo; if(m.operation && m.operation.body) m.operation.body=todo; cb(e,m); }); },
		delete          : function(m,cb){ S.delete(m.id||m.operation.body.id,function(e,id  ){ cb(e,m);}); },
		delete_completed: function(m,cb){ S.delete_completed(function(e){ cb(e,m);}); },
		all_completed   : function(m,cb){ S.all_completed(m.completed,function(e){ cb(e,m);}); },
		get             : function(m,cb){ S.get(m.id||m.operation.body.id,function(e,todo){ m.todo=todo; cb(e,m);}); },
		get_all         : function(m,cb){
			m.query = m.query || {};
			var
				from = m.query.from ? parseInt(m.query.from) : null,
				to   = m.query.to   ? parseInt(m.query.to)   : null,
				limit= m.query.limit? parseInt(m.query.limit): null;
			
			S.get_all(from,to,limit,m.filter,function(err,results){
				if(err || !results){ cb(err,m); return; }
				
				// callback called for each found element
				var forwarded=false;
				results(function(value,next){
					if(!value){ if(!forwarded){ cb(null,m); } return; } // call callback at least once...
					forwarded=true;
					m={}; // new message to prevent any side effect
					m.properties={};
					m.operation = { method: 'put', url: '/todos/'+encodeURI(value.id) , body: value };
					m.properties.operation=true;
					cb(null,m);
					next && next();
				});
			});
		},
		count : function F(m,cb){
			cb(null,m);
			
			S.count(function (err,counts){
				// send counts only if changed
				
				if( F.previous && F.previous.count === counts.count && F.previous.completed === counts.completed) return;
				
				F.previous = counts;
				
				cb(null,{operation : { method: 'put', url: '/todos/count' , body: counts }});
			});
		}
	};
	
	S.pipeline = {
		
		create : pipeline.and([
			db.select.post,
			db.select.url(/\/todos\/?$/),
			// db.operation.add_id, done by auto increment
			S.todo.completed2number,
			S.todo.post,
			S.todo.number2completed,
			S.todo.count
		]),
		
		completed: pipeline.and([
			db.select.put,
			db.select.url(/\/todos\/([^\/]+)\/completed$/,['id']),
			S.todo.completed2number,
			db.operation.completed,
			S.todo.get,
			function(m){ m.todo.completed = m.completed; return m;},
			S.todo.put,
			S.todo.number2completed,
			S.todo.count
		]),
		
		all_completed: pipeline.and([
			db.select.put,
			db.select.url(/\/todos\/completed$/),
			S.todo.completed2number,
			db.operation.completed,
			S.todo.all_completed,
			S.todo.number2completed,
			S.todo.count
		]),
		
		title: pipeline.and([
			db.select.put,
			db.select.url(/\/todos\/([^\/]+)\/title$/,['id']),
			db.operation.title,
			S.todo.get,
			function(m){ m.todo.title = m.title; return m;},
			S.todo.put
			// no count as a title change doesn't change counts
		]),
		
		
		delete_completed: pipeline.and([
			db.select.delete,
			db.select.url(/\/todos\/completed$/),
			S.todo.delete_completed,
			S.todo.count
		]),
		
		
		delete: pipeline.and([
			db.select.delete,
			db.select.url(/\/todos\/([^\/]+)$/,['id']),
			S.todo.delete,
			S.todo.count
		]),
		
		
		/*filter : {
			set: pipeline.and([
				db.select.put,
				db.select.url(/\/todos$/)
			])
		},*/
		
		get : {
			all : pipeline.and([
				db.select.get,
				db.select.url(/\/todos\/(completed|active)?(\?|$)/,['filter']),
				url.query,
				S.todo.get_all,
				S.todo.number2completed,
				S.todo.count, // do count before, to not do a count on each retrieved element but just once
			]),
			/*
			id : pipeline.and([
				db.select.get,
				db.select.url(/\/todos\/([^\/]+)$/,['id']),
				S.todo.get,
				S.todo.number2completed,
			])
			*/
		}
	};
	
	var operation = S.pipeline;
	
	S.input = {
		handler : pipeline.and([
			S.todo.init,
			pipeline.or([
				operation.create,
				operation.completed,
				operation.all_completed,
				operation.title,
				operation.delete_completed,
				operation.delete,
				//operation.filter.set
				operation.get.all,
				function(m){return m;}
			]),
			function(m){ return S.output.handler(m); }
		])
	};
	
	S.output = {
		handler: function(m){return m;}
	};
	
	
})(store);

///////////////////////////////////////////////////////////

var action    = ui.pipeline;
var operation = db.pipeline;


// BACKEND
events.backend.input.handler = pipeline.and([
	ui.filter.inject,
	pipeline.or([
		operation.create,
		operation.completed,
		operation.all_completed,
		operation.title,
		operation.update_count,
		operation.update,
		operation.delete_completed,
		operation.delete,
		pipeline.and([
			operation.filter.set,
			operation.filter.reinit
		])
	]),
	//operation.list,  doune by update_count ....
	operation.filter.apply
]);



// zero backend output <- input
// ZERO async events.backend.output.handler = function(m){ setTimeout(function(){ events.backend.input.handler(m); },0); };

// ZERO sync events.backend.output.handler = events.backend.input.handler;
//
// storage:  backend output -> store input -> store.output -> backend input
events.backend.output.handler = store.input.handler;
store.output.handler = events.backend.input.handler;

// UI
events.frontend.handler = pipeline.and([
	ui.filter.inject,
	pipeline.or([
		action.create,
		action.completed,
		action.all_completed,
		action.destroy,
		action.destroy_completed,
		action.edit.begin,
		action.edit.commit,
		action.edit.abort,
		action.filter,
		action.paint
	]),
	events.backend.output.log,
	events.backend.output.handler
]);
