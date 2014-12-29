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
						     if ( set && !~i) el.className = cl+' '+name;
						else if (!set &&  ~i) el.className = cl.substring(0,i)+cl.substring(i+l);
					},
					add_class    = toggle_class.bind(null,!inverse ), // flip meaning based on inverse
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
			add : function(m){ if( m.list && m.item) m.list.appendChild(m.item); m.item = m.list.lastElementChild; return m; }
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
						for(var i=1,l=match.lenght;i<l;++i){
							var g=match[i];
							if(g) m[i-1]=g;
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
				if (id === void 0) body.id = new_id();
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
					if(!('from' in m)) return m;
					m.operation = { method: 'get', url: '/todos/?from='+m.from+'&limit='+ ( m.limit || 10000 )  };
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

todo.frontend.scroll = {
	offset: void 0
};
(function(scroll){
	todo.frontend.scroll.select = {
		init : function(m){
			if(typeof(scroll.offset)==='undefined'){
				scroll.offset = 0;
				m.from  = 0;
			}
			return m;
		}
	};
})(todo.frontend.scroll);

location.href = location.pathname+'#/'+todo.frontend.filter.value;

// FRAMEWORK
var pipeline = {
	debug : function(msg,debug){ var f = function(m){ console.log(msg + ':' + m ); if(debug) debugger; }; f.debug=true; return f;},
	
	call: function (and,array){
		var self=this;
		
		return function(m,cb){
			m = m || {};
			
			if(m.error){ cb && cb(m.error,m); return; }
			
			var l=array.length;
			(function next(i){
				if(i>=l){ cb && cb(null,m); return; }
				
				var f=array[i++];
				
				if(f.debug){ f(m); next(i); return; }
				
				if(f.length===1) f = (function(f){ return function(m,f_cb){ m=f(m); f_cb(null,m); }; })(f);
				
				try {
					f(m,function(err,m){
						if(err && !(m && m.error)){
							m = m || {};
							m.error = err;
						}
						if( ( and ? m !== void 0 : m === void 0) && !(m && m.error) ) next(i);
						else cb && cb( m ? m.error : null, m);
					});
				} catch(err) {
					console.log(err);
					console.log(err.stack);
					m.error = err;
					cb && cb(m.error,m);
				}
			})(0);
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
		function F(m){
			if (F.lastPosition === window.pageYOffset) {
				return;
			}
			F.lastPosition = window.pageYOffset;
			return m;
		},
		ui.scroll.select.init,
		db.operation.get.all
	]),
};

// REACTING ON BACKEND INPUT

(function(){

//  reusable pipeline section
var render_completed = pipeline.and([
	db.operation.completed,
	ui.element.toggle('item','completed','completed'),
	
	function(m){ m.value = m.completed ? ++db.list.completed : (db.list.completed > 0 ? --db.list.completed : 0); return m;}, // total completed
	ui.element.find1('clear','#clear-completed'),
	ui.element.toggle('clear','value','hidden',true),
	
	function(m){ m['completed-all'] = db.list.completed===db.list.count  ; return m;},
	ui.element.find1('toggle-all','#toggle-all'),
	ui.element.value.set('toggle-all','completed-all'),
]);

db.pipeline = {
	// if we get a post for the collection we get the item template, render it, add it to the list and finally we log the executed operation
	create : pipeline.and([
		db.select.post,
		db.select.url(/\/todos\/?$/),
		db.operation.add_id,
		ui.list,
		ui.item.template.create,
		ui.item.template.render,
		ui.item.add,
		function(m){ m.count=++db.list.count; return m;},
		
		render_completed,
		
		events.backend.input.log
	]),
	
	completed: pipeline.and([
		db.select.put,
		db.select.url(/\/todos\/([^\/]+)\/completed$/,['id']),
		ui.item.find.id,
		
		render_completed,
		
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
		
		function(m){ m.value = m.completed ? (db.list.completed=db.list.count) : (db.list.completed=0) ; return m;}, // total completed
		ui.element.find1('clear','#clear-completed','clear'),
		ui.element.toggle('clear','value','hidden',true),
		
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
		function(m){ m.count = db.list.count-db.list.completed; return m;},
		
		function(m){ m.value = db.list.completed=0; return m;},
		ui.element.find1('clear','#clear-completed'),
		ui.element.toggle('clear','value','hidden',true),
		
		events.backend.input.log
	]),
	
	delete: pipeline.and([
		db.select.delete,
		db.select.url(/\/todos\/([^\/]+)$/,['id']),
		ui.item.find.id,
		
		ui.element.find1('toggle','input.toggle','item'),
		function(m){ if(m.toggle && m.toggle.checked) m.value = --db.list.completed; return m;}, // total completed
		ui.element.find1('clear','#clear-completed'),
		ui.element.toggle('clear','value','hidden',true),
		
		ui.element.remove('item'),
		
		function(m){ m.count=--db.list.count; return m;},
		events.backend.input.log
	]),
	
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
		if(!called && f){ called = true; f.apply(this,arguments); }
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

var store={
	db  : null,
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
	
	put: function(todo,cb){
		cb = once(cb);
		var
			self  = this,
			tx    = self.db.transaction(['todos'], 'readwrite');
		tx.oncomplete = function() {
			cb(null,todo);
		};
		tx_handle(tx,cb,'put');
		
		var
			store = tx.objectStore('todos'),
			r = store.put(todo);
			r.onsuccess = function (e) { todo.id = e.target.result; };
			r_handle(r,cb,'put',true);
	},
	
	index:function(index, range, cb){ // loop over an index using a range, we return a function as iterator
		cb=once(cb);
		var
			self  = this,
			r     = index.openCursor(range,'nextunique'),
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
	get:function(id, cb){
		//id=parseInt(id);
		cb=once(cb);
		var
			self  = this,
			todo  = null,
			tx    = self.db.transaction(['todos'],'readonly');
		tx.oncomplete = function() { cb(null,todo); };
		tx_handle(tx,cb,'get');
		
		var
			store = tx.objectStore('todos'),
			r = store.get(parseInt(id));
		r.onsuccess = function(e) {
			todo=e.target.result;
		};
		r_handle(r,cb,'get');
	},
	delete:function(id, cb){
		cb=once(cb);
		var
			self  = this,
			tx    = self.db.transaction(['todos'],'readwrite');
		tx.oncomplete = function() { cb(null,id); };
		tx_handle(tx,cb,'delete');
		var
			store = tx.objectStore('todos'),
			r = store.delete(parseInt(id));
	},
	delete_completed:function(cb){
		cb=once(cb);
		var self=this;
		self.get_all(null,null,-1,'completed',true,function(err,results){
			if(err||!results){ cb(err,null); return; }
			results(function(value,next,request){
				if(!value || !request || !request.result){ cb(null,true); return; }
				
				var r = request.result.delete();
				r.onsuccess = function(e) { next && next(); };
				r_handle(r,cb,'delete completed');
			});
		});
	},
	all_completed:function(completed,cb){
		cb=once(cb);
		var self=this;
		self.get_all(null,null,-1,completed ? 'active' : 'completed',true,function(err,results){
			if(err||!results){ cb(err,null); return; }
			results(function(value,next,request){
				//debugger;
				if(!value || !request || !request.result){ cb(null,true); return; }
				value.completed = completed;
				var r = request.result.update(value);
				r.onsuccess = function(e) { next && next(); };
				r_handle(r,cb,'all completed');
			});
		});
	},
	get_all:function(after_id,before_id,limit,filter,write,cb){           // /todos/all?from=id&limit=20
		cb=once(cb);
		after_id  = after_id || 0;
		before_id = before_id || Number.MAX_VALUE;
		if(filter==='all') filter = null;
		var
			self  = this,
			tx    = self.db.transaction(['todos'], write ? 'readwrite':'readonly');
		tx.oncomplete = function() { cbx(cb,'get_all')(null,null); };
		tx_handle(tx,cb,'get_all');
		
		var
			store = tx.objectStore('todos'),
			index = !filter ? store : store.index('completed_id'),
			lower = !filter ? after_id  : [filter==='completed'?1:0,after_id ],
			upper = !filter ? before_id : [filter==='completed'?1:0,before_id],
			range = window.IDBKeyRange.bound(lower,upper, true, true); // exclude lower/uper
		
		self.index(index,range,function(err,results){
			if(err||!results){ cb(err,null); return; }
			cb(null,function(f){
				results(function(v,next,r){
					if(limit!==-1 && (--limit)===0 ){ f(v,null,r); return; }
					f(v,next,r);
				});
			});
		});
	}
};
///////////////////////////////////////////////////////////

(function(S){
	
	S.todo = {
		init            : function(m,cb){ S.init(function(err){cb(err,m);}); },
		completed2number: function(m){ var tmp; if((tmp=m)&&(tmp=tmp.operation)&&(tmp=tmp.body)){ tmp.completed = tmp.completed ? 1 : 0; } return m; },
		number2completed: function(m){ var tmp; if((tmp=m)&&(tmp=tmp.operation)&&(tmp=tmp.body)){ tmp.completed = tmp.completed === 1;   } return m; },
		put             : function(m,cb){ S.put   (m.todo||m.operation.body   ,function(e,todo){ m.todo=todo; if(m.operation && m.operation.body) m.operation.body=todo; cb(e,m); }); },
		get             : function(m,cb){ S.get   (m.id  ||m.operation.body.id,function(e,todo){ m.todo=todo; cb(e,m);}); },
		delete          : function(m,cb){ S.delete(m.id  ||m.operation.body.id,function(e,id  ){              cb(e,m);}); },
		delete_completed: function(m,cb){ S.delete_completed(                  function(e     ){              cb(e,m);}); },
		all_completed   : function(m,cb){ S.all_completed(m.completed         ,function(e     ){              cb(e,m);}); },
		get_all         : function(m,cb){
			m.query = m.query || {};
			S.get_all(parseInt(m.query.from),null,parseInt(m.query.limit),m.filter,false,function(err,results){
				if(err || !results){ cb(err,m); return; }
				// callback called for each found element
				var forwarded=false;
				results(function(value,next){
					if(!value){ if(!forwarded){ cb(null,m); } return; } // call callback at least once...
					forwarded=true;
					m.operation = { method: 'post', url: '/todos', body: value };
					m.properties.operation=true;
					cb(null,m);
					next && next();
				});
			});
		}
	};
	
	S.pipeline = {
		
		create : pipeline.and([
			db.select.post,
			db.select.url(/\/todos\/?$/),
			// db.operation.add_id, done by auto increment
			S.todo.completed2number,
			S.todo.put,
			S.todo.number2completed,
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
		]),
		
		all_completed: pipeline.and([
			db.select.put,
			db.select.url(/\/todos\/completed$/),
			S.todo.completed2number,
			db.operation.completed,
			S.todo.all_completed,
			S.todo.number2completed,
		]),
		
		title: pipeline.and([
			db.select.put,
			db.select.url(/\/todos\/([^\/]+)\/title$/,['id']),
			db.operation.title,
			S.todo.get,
			function(m){ m.todo.title = m.title; },
			S.todo.put
		]),
		
		
		delete_completed: pipeline.and([
			db.select.delete,
			db.select.url(/\/todos\/completed$/),
			S.todo.delete_completed
		]),
		
		
		delete: pipeline.and([
			db.select.delete,
			db.select.url(/\/todos\/([^\/]+)$/,['id']),
			S.todo.delete,
		]),
		
		/*
		filter : {
			set: pipeline.and([
				db.select.put,
				db.select.url(/\/todos$/)
			])
		}*/
		
		get : {
			all : pipeline.and([
				db.select.get,
				db.select.url(/\/todos\/(complete|active)?(\?|$)/,['filter']),
				url.query,
				S.todo.get_all,
				S.todo.number2completed,
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
				operation.get.all
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
		operation.delete_completed,
		operation.delete,
		operation.filter.set
	]),
	operation.list,
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
