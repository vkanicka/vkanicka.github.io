
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.46.3' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/App.svelte generated by Svelte v3.46.3 */

    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[12] = list[i];
    	child_ctx[14] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[15] = list[i];
    	child_ctx[17] = i;
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[18] = list[i];
    	return child_ctx;
    }

    // (49:6) {:else}
    function create_else_block_2(ctx) {
    	let button;
    	let t_value = /*letter*/ ctx[18] + "";
    	let t;
    	let mounted;
    	let dispose;

    	function click_handler_2() {
    		return /*click_handler_2*/ ctx[7](/*letter*/ ctx[18]);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "class", "alphi baseline svelte-43raot");
    			add_location(button, file, 49, 8, 1331);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler_2, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_2.name,
    		type: "else",
    		source: "(49:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (39:6) {#if guessBoard[0].indexOf(letter) >= 0 || guessBoard[1].indexOf(letter) >= 0 || guessBoard[2].indexOf(letter) >= 0 || guessBoard[3].indexOf(letter) >= 0 || guessBoard[4].indexOf(letter) >= 0}
    function create_if_block_2(ctx) {
    	let show_if;
    	let if_block_anchor;

    	function select_block_type_1(ctx, dirty) {
    		if (dirty & /*wordle*/ 1) show_if = null;
    		if (show_if == null) show_if = !!/*wordle*/ ctx[0].includes(/*letter*/ ctx[18]);
    		if (show_if) return create_if_block_3;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type_1(ctx, -1);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type_1(ctx, dirty)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(39:6) {#if guessBoard[0].indexOf(letter) >= 0 || guessBoard[1].indexOf(letter) >= 0 || guessBoard[2].indexOf(letter) >= 0 || guessBoard[3].indexOf(letter) >= 0 || guessBoard[4].indexOf(letter) >= 0}",
    		ctx
    	});

    	return block;
    }

    // (44:8) {:else}
    function create_else_block_1(ctx) {
    	let button;
    	let t_value = /*letter*/ ctx[18] + "";
    	let t;
    	let mounted;
    	let dispose;

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[6](/*letter*/ ctx[18]);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "class", "alphi black svelte-43raot");
    			add_location(button, file, 44, 10, 1196);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler_1, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(44:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (40:8) {#if wordle.includes(letter)}
    function create_if_block_3(ctx) {
    	let button;
    	let t_value = /*letter*/ ctx[18] + "";
    	let t;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[5](/*letter*/ ctx[18]);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "class", "alphi aqua svelte-43raot");
    			add_location(button, file, 40, 10, 1072);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(40:8) {#if wordle.includes(letter)}",
    		ctx
    	});

    	return block;
    }

    // (38:4) {#each ALPHABET as letter}
    function create_each_block_2(ctx) {
    	let show_if;
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (dirty & /*guessBoard*/ 2) show_if = null;
    		if (show_if == null) show_if = !!(/*guessBoard*/ ctx[1][0].indexOf(/*letter*/ ctx[18]) >= 0 || /*guessBoard*/ ctx[1][1].indexOf(/*letter*/ ctx[18]) >= 0 || /*guessBoard*/ ctx[1][2].indexOf(/*letter*/ ctx[18]) >= 0 || /*guessBoard*/ ctx[1][3].indexOf(/*letter*/ ctx[18]) >= 0 || /*guessBoard*/ ctx[1][4].indexOf(/*letter*/ ctx[18]) >= 0);
    		if (show_if) return create_if_block_2;
    		return create_else_block_2;
    	}

    	let current_block_type = select_block_type(ctx, -1);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx, dirty)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(38:4) {#each ALPHABET as letter}",
    		ctx
    	});

    	return block;
    }

    // (66:10) {:else}
    function create_else_block(ctx) {
    	let div;
    	let t_value = /*guessBoard*/ ctx[1][/*gr*/ ctx[14]][/*gi*/ ctx[17]] + "";
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(t_value);
    			attr_dev(div, "class", "guessI svelte-43raot");
    			attr_dev(div, "id", /*gi*/ ctx[17]);
    			add_location(div, file, 66, 12, 1974);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*guessBoard*/ 2 && t_value !== (t_value = /*guessBoard*/ ctx[1][/*gr*/ ctx[14]][/*gi*/ ctx[17]] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(66:10) {:else}",
    		ctx
    	});

    	return block;
    }

    // (64:89) 
    function create_if_block_1(ctx) {
    	let div;
    	let t_value = /*guessBoard*/ ctx[1][/*gr*/ ctx[14]][/*gi*/ ctx[17]] + "";
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(t_value);
    			attr_dev(div, "class", "guessI yellow svelte-43raot");
    			attr_dev(div, "id", /*gi*/ ctx[17]);
    			add_location(div, file, 64, 12, 1882);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*guessBoard*/ 2 && t_value !== (t_value = /*guessBoard*/ ctx[1][/*gr*/ ctx[14]][/*gi*/ ctx[17]] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(64:89) ",
    		ctx
    	});

    	return block;
    }

    // (62:10) {#if guessBoard[gr][gi] === wordle[gi]}
    function create_if_block(ctx) {
    	let div;
    	let t_value = /*guessBoard*/ ctx[1][/*gr*/ ctx[14]][/*gi*/ ctx[17]] + "";
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(t_value);
    			attr_dev(div, "class", "guessI green svelte-43raot");
    			attr_dev(div, "id", /*gi*/ ctx[17]);
    			add_location(div, file, 62, 12, 1719);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*guessBoard*/ 2 && t_value !== (t_value = /*guessBoard*/ ctx[1][/*gr*/ ctx[14]][/*gi*/ ctx[17]] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(62:10) {#if guessBoard[gr][gi] === wordle[gi]}",
    		ctx
    	});

    	return block;
    }

    // (61:8) {#each guessRow as guessI, gi}
    function create_each_block_1(ctx) {
    	let show_if;
    	let if_block_anchor;

    	function select_block_type_2(ctx, dirty) {
    		if (dirty & /*guessBoard, wordle*/ 3) show_if = null;
    		if (/*guessBoard*/ ctx[1][/*gr*/ ctx[14]][/*gi*/ ctx[17]] === /*wordle*/ ctx[0][/*gi*/ ctx[17]]) return create_if_block;
    		if (show_if == null) show_if = !!(/*guessBoard*/ ctx[1][/*gr*/ ctx[14]][/*gi*/ ctx[17]] !== "" && /*wordle*/ ctx[0].indexOf(/*guessBoard*/ ctx[1][/*gr*/ ctx[14]][/*gi*/ ctx[17]]) >= 0);
    		if (show_if) return create_if_block_1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type_2(ctx, -1);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type_2(ctx, dirty)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(61:8) {#each guessRow as guessI, gi}",
    		ctx
    	});

    	return block;
    }

    // (59:4) {#each guessBoard as guessRow, gr}
    function create_each_block(ctx) {
    	let div;
    	let t;
    	let each_value_1 = /*guessRow*/ ctx[12];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			attr_dev(div, "class", "guessRow svelte-43raot");
    			attr_dev(div, "id", /*gr*/ ctx[14]);
    			add_location(div, file, 59, 6, 1587);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*guessBoard, wordle*/ 3) {
    				each_value_1 = /*guessRow*/ ctx[12];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, t);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(59:4) {#each guessBoard as guessRow, gr}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let div0;
    	let t2;
    	let div1;
    	let mounted;
    	let dispose;
    	let each_value_2 = /*ALPHABET*/ ctx[2];
    	validate_each_argument(each_value_2);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_1[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let each_value = /*guessBoard*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "WORDLE";
    			t1 = space();
    			div0 = element("div");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t2 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(h1, "class", "svelte-43raot");
    			add_location(h1, file, 34, 2, 708);
    			attr_dev(div0, "class", "keyboard svelte-43raot");
    			add_location(div0, file, 36, 2, 771);
    			attr_dev(div1, "class", "gridContainer svelte-43raot");
    			add_location(div1, file, 57, 2, 1514);
    			attr_dev(main, "class", "svelte-43raot");
    			add_location(main, file, 33, 0, 699);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			append_dev(main, div0);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div0, null);
    			}

    			append_dev(main, t2);
    			append_dev(main, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			if (!mounted) {
    				dispose = listen_dev(window, "keydown", /*handleKeydown*/ ctx[4], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*add, ALPHABET, wordle, guessBoard*/ 15) {
    				each_value_2 = /*ALPHABET*/ ctx[2];
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_2(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_2.length;
    			}

    			if (dirty & /*guessBoard, wordle*/ 3) {
    				each_value = /*guessBoard*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let { wordle } = $$props;
    	const ALPHABET = ("QWERTYUIOPASDFGHJKLZXCVBNM").split("");
    	let letterCount = 0;
    	let wordCount = 0;

    	const guessBoard = [
    		["", "", "", "", ""],
    		["", "", "", "", ""],
    		["", "", "", "", ""],
    		["", "", "", "", ""],
    		["", "", "", "", ""],
    		["", "", "", "", ""]
    	];

    	const add = letter => {
    		$$invalidate(1, guessBoard[wordCount][letterCount] = letter, guessBoard);
    		letterCount++;

    		if (letterCount % 5 === 0) {
    			wordCount++;
    			letterCount = 0;
    		}
    	};

    	let key;
    	let keyCode;

    	function handleKeydown(event) {
    		key = event.key;
    		keyCode = event.keyCode;
    		add(key.toUpperCase());
    	}

    	const writable_props = ['wordle'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const click_handler = letter => add(letter);
    	const click_handler_1 = letter => add(letter);
    	const click_handler_2 = letter => add(letter);

    	$$self.$$set = $$props => {
    		if ('wordle' in $$props) $$invalidate(0, wordle = $$props.wordle);
    	};

    	$$self.$capture_state = () => ({
    		wordle,
    		ALPHABET,
    		letterCount,
    		wordCount,
    		guessBoard,
    		add,
    		key,
    		keyCode,
    		handleKeydown
    	});

    	$$self.$inject_state = $$props => {
    		if ('wordle' in $$props) $$invalidate(0, wordle = $$props.wordle);
    		if ('letterCount' in $$props) letterCount = $$props.letterCount;
    		if ('wordCount' in $$props) wordCount = $$props.wordCount;
    		if ('key' in $$props) key = $$props.key;
    		if ('keyCode' in $$props) keyCode = $$props.keyCode;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		wordle,
    		guessBoard,
    		ALPHABET,
    		add,
    		handleKeydown,
    		click_handler,
    		click_handler_1,
    		click_handler_2
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { wordle: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*wordle*/ ctx[0] === undefined && !('wordle' in props)) {
    			console.warn("<App> was created without expected prop 'wordle'");
    		}
    	}

    	get wordle() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set wordle(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const wordles = [

        'about', 
    'above', 
    'abuse', 
    'actor', 
    'acute', 
    'admit', 
    'adopt', 
    'adult', 
    'after', 
    'again', 
    'agent', 
    'agree', 
    'ahead', 
    'alarm', 
    'album', 
    'alert', 
    'alike', 
    'alive', 
    'allow', 
    'alone', 
    'along', 
    'alter', 
    'among', 
    'anger', 
    'Angle', 
    'angry', 
    'apart', 
    'apple', 
    'apply', 
    'arena', 
    'argue', 
    'arise', 
    'array', 
    'aside', 
    'asset', 
    'audio', 
    'audit', 
    'avoid', 
    'award', 
    'aware', 
    'badly', 
    'baker', 
    'bases', 
    'basic', 
    'basis', 
    'beach', 
    'began', 
    'begin', 
    'begun', 
    'being', 
    'below', 
    'bench', 
    'billy', 
    'birth', 
    'black', 
    'blame', 
    'blind', 
    'block', 
    'blood', 
    'board', 
    'boost', 
    'booth', 
    'bound', 
    'brain', 
    'brand', 
    'bread', 
    'break', 
    'breed', 
    'brief', 
    'bring', 
    'broad', 
    'broke', 
    'brown', 
    'build', 
    'built', 
    'buyer', 
    'cable', 
    'calif', 
    'carry', 
    'catch', 
    'cause', 
    'chain', 
    'chair', 
    'chart', 
    'chase', 
    'cheap', 
    'check', 
    'chest', 
    'chief', 
    'child', 
    'china', 
    'chose', 
    'civil', 
    'claim', 
    'class', 
    'clean', 
    'clear', 
    'click', 
    'clock', 
    'close', 
    'coach', 
    'coast', 
    'could', 
    'count', 
    'court', 
    'cover', 
    'craft', 
    'crash', 
    'cream', 
    'crime', 
    'cross', 
    'crowd', 
    'crown', 
    'curve', 
    'cycle', 
    'daily', 
    'dance', 
    'dated', 
    'dealt', 
    'death', 
    'debut', 
    'delay', 
    'depth', 
    'doing', 
    'doubt', 
    'dozen', 
    'draft', 
    'drama', 
    'drawn', 
    'dream', 
    'dress', 
    'drill', 
    'drink', 
    'drive', 
    'drove', 
    'dying', 
    'eager', 
    'early', 
    'earth', 
    'eight', 
    'elite', 
    'empty', 
    'enemy', 
    'enjoy', 
    'enter', 
    'entry', 
    'equal', 
    'error', 
    'event', 
    'every', 
    'exact', 
    'exist', 
    'extra', 
    'faith', 
    'FALSE', 
    'fault', 
    'fiber', 
    'field', 
    'fifth', 
    'fifty', 
    'fight', 
    'final', 
    'first', 
    'fixed', 
    'flash', 
    'fleet', 
    'floor', 
    'fluid', 
    'focus', 
    'force', 
    'forth', 
    'forty', 
    'forum', 
    'found', 
    'frame', 
    'frank', 
    'fraud', 
    'fresh', 
    'front', 
    'fruit', 
    'fully', 
    'funny', 
    'giant', 
    'given', 
    'glass', 
    'globe', 
    'going', 
    'grace', 
    'grade', 
    'grand', 
    'grant', 
    'grass', 
    'great', 
    'green', 
    'gross', 
    'group', 
    'grown', 
    'guard', 
    'guess', 
    'guest', 
    'guide', 
    'happy', 
    'harry', 
    'heart', 
    'heavy', 
    'hence', 
    'henry', 
    'horse', 
    'hotel', 
    'house', 
    'human', 
    'ideal', 
    'image', 
    'index', 
    'inner', 
    'input', 
    'issue', 
    'japan', 
    'jimmy', 
    'joint', 
    'jones', 
    'judge', 
    'known', 
    'label', 
    'large', 
    'laser', 
    'later', 
    'laugh', 
    'layer', 
    'learn', 
    'lease', 
    'least', 
    'leave', 
    'legal', 
    'level', 
    'lewis', 
    'light', 
    'limit', 
    'links', 
    'lives', 
    'local', 
    'logic', 
    'loose', 
    'lower', 
    'lucky', 
    'lunch', 
    'lying', 
    'magic', 
    'major', 
    'maker', 
    'march', 
    'maria', 
    'match', 
    'maybe', 
    'mayor', 
    'meant', 
    'media', 
    'metal', 
    'might', 
    'minor', 
    'minus', 
    'mixed', 
    'model', 
    'money', 
    'month', 
    'moral', 
    'motor', 
    'mount', 
    'mouse', 
    'mouth', 
    'movie', 
    'music', 
    'needs', 
    'never', 
    'newly', 
    'night', 
    'noise', 
    'north', 
    'noted', 
    'novel', 
    'nurse', 
    'occur', 
    'ocean', 
    'offer', 
    'often', 
    'order', 
    'other', 
    'ought', 
    'paint', 
    'panel', 
    'paper', 
    'party', 
    'peace', 
    'peter', 
    'phase', 
    'phone', 
    'photo', 
    'piece', 
    'pilot', 
    'pitch', 
    'place', 
    'plain', 
    'plane', 
    'plant', 
    'plate', 
    'point', 
    'pound', 
    'power', 
    'press', 
    'price', 
    'pride', 
    'prime', 
    'print', 
    'prior', 
    'prize', 
    'proof', 
    'proud', 
    'prove', 
    'queen', 
    'quick', 
    'quiet', 
    'quite', 
    'radio', 
    'raise', 
    'range', 
    'rapid', 
    'ratio', 
    'reach', 
    'ready', 
    'refer', 
    'right', 
    'rival', 
    'river', 
    'robin', 
    'roger', 
    'roman', 
    'rough', 
    'round', 
    'route', 
    'royal', 
    'rural', 
    'scale', 
    'scene', 
    'scope', 
    'score', 
    'sense', 
    'serve', 
    'seven', 
    'shall', 
    'shape', 
    'share', 
    'sharp', 
    'sheet', 
    'shelf', 
    'shell', 
    'shift', 
    'shirt', 
    'shock', 
    'shoot', 
    'short', 
    'shown', 
    'sight', 
    'since', 
    'sixth', 
    'sixty', 
    'sized', 
    'skill', 
    'sleep', 
    'slide', 
    'small', 
    'smart', 
    'smile', 
    'smith', 
    'smoke', 
    'solid', 
    'solve', 
    'sorry', 
    'sound', 
    'south', 
    'space', 
    'spare', 
    'speak', 
    'speed', 
    'spend', 
    'spent', 
    'split', 
    'spoke', 
    'sport', 
    'staff', 
    'stage', 
    'stake', 
    'stand', 
    'start', 
    'state', 
    'steam', 
    'steel', 
    'stick', 
    'still', 
    'stock', 
    'stone', 
    'stood', 
    'store', 
    'storm', 
    'story', 
    'strip', 
    'stuck', 
    'study', 
    'stuff', 
    'style', 
    'sugar', 
    'suite', 
    'super', 
    'sweet', 
    'table', 
    'taken', 
    'taste', 
    'taxes', 
    'teach', 
    'teeth', 
    'terry', 
    'texas', 
    'thank', 
    'theft', 
    'their', 
    'theme', 
    'there', 
    'these', 
    'thick', 
    'thing', 
    'think', 
    'third', 
    'those', 
    'three', 
    'threw', 
    'throw', 
    'tight', 
    'times', 
    'tired', 
    'title', 
    'today', 
    'topic', 
    'total', 
    'touch', 
    'tough', 
    'tower', 
    'track', 
    'trade', 
    'train', 
    'treat', 
    'trend', 
    'trial', 
    'tried', 
    'tries', 
    'truck', 
    'truly', 
    'trust', 
    'truth', 
    'twice', 
    'under', 
    'undue', 
    'union', 
    'unity', 
    'until', 
    'upper', 
    'upset', 
    'urban', 
    'usage', 
    'usual', 
    'valid', 
    'value', 
    'video', 
    'virus', 
    'visit', 
    'vital', 
    'voice', 
    'waste', 
    'watch', 
    'water', 
    'wheel', 
    'where', 
    'which', 
    'while', 
    'white', 
    'whole', 
    'whose', 
    'woman', 
    'women', 
    'world', 
    'worry', 
    'worse', 
    'worst', 
    'worth', 
    'would', 
    'wound', 
    'write', 
    'wrong', 
    'wrote', 
    'yield', 
    'young', 
    'youth'
    ];

    const rando = (min, max) => { return Math.floor(Math.random() * (max - min + 1) + min) };

    const app = new App({
    	target: document.body,
    	props: {
    		wordle: wordles[rando(1,500)].toUpperCase()
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
