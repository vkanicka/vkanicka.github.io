
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

    /* src/App.svelte generated by Svelte v3.46.3 */
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[16] = list[i];
    	child_ctx[18] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[19] = list[i];
    	child_ctx[21] = i;
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[22] = list[i];
    	return child_ctx;
    }

    // (84:6) {:else}
    function create_else_block_2(ctx) {
    	let button;
    	let t_value = /*letter*/ ctx[22] + "";
    	let t;
    	let mounted;
    	let dispose;

    	function click_handler_2() {
    		return /*click_handler_2*/ ctx[9](/*letter*/ ctx[22]);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "class", "alphi baseline svelte-y4zuf3");
    			add_location(button, file, 84, 8, 2139);
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
    		source: "(84:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (74:6) {#if guessBoard[0].indexOf(letter) >= 0 || guessBoard[1].indexOf(letter) >= 0 || guessBoard[2].indexOf(letter) >= 0 || guessBoard[3].indexOf(letter) >= 0 || guessBoard[4].indexOf(letter) >= 0}
    function create_if_block_2(ctx) {
    	let show_if;
    	let if_block_anchor;

    	function select_block_type_1(ctx, dirty) {
    		if (dirty & /*wordle*/ 2) show_if = null;
    		if (show_if == null) show_if = !!/*wordle*/ ctx[1].includes(/*letter*/ ctx[22]);
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
    		source: "(74:6) {#if guessBoard[0].indexOf(letter) >= 0 || guessBoard[1].indexOf(letter) >= 0 || guessBoard[2].indexOf(letter) >= 0 || guessBoard[3].indexOf(letter) >= 0 || guessBoard[4].indexOf(letter) >= 0}",
    		ctx
    	});

    	return block;
    }

    // (79:8) {:else}
    function create_else_block_1(ctx) {
    	let button;
    	let t_value = /*letter*/ ctx[22] + "";
    	let t;
    	let mounted;
    	let dispose;

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[8](/*letter*/ ctx[22]);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "class", "alphi black svelte-y4zuf3");
    			add_location(button, file, 79, 10, 2004);
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
    		source: "(79:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (75:8) {#if wordle.includes(letter)}
    function create_if_block_3(ctx) {
    	let button;
    	let t_value = /*letter*/ ctx[22] + "";
    	let t;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[7](/*letter*/ ctx[22]);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "class", "alphi aqua svelte-y4zuf3");
    			add_location(button, file, 75, 10, 1880);
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
    		source: "(75:8) {#if wordle.includes(letter)}",
    		ctx
    	});

    	return block;
    }

    // (73:4) {#each ALPHABET as letter}
    function create_each_block_2(ctx) {
    	let show_if;
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (dirty & /*guessBoard*/ 1) show_if = null;
    		if (show_if == null) show_if = !!(/*guessBoard*/ ctx[0][0].indexOf(/*letter*/ ctx[22]) >= 0 || /*guessBoard*/ ctx[0][1].indexOf(/*letter*/ ctx[22]) >= 0 || /*guessBoard*/ ctx[0][2].indexOf(/*letter*/ ctx[22]) >= 0 || /*guessBoard*/ ctx[0][3].indexOf(/*letter*/ ctx[22]) >= 0 || /*guessBoard*/ ctx[0][4].indexOf(/*letter*/ ctx[22]) >= 0);
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
    		source: "(73:4) {#each ALPHABET as letter}",
    		ctx
    	});

    	return block;
    }

    // (103:10) {:else}
    function create_else_block(ctx) {
    	let div;
    	let t_value = /*guessBoard*/ ctx[0][/*gr*/ ctx[18]][/*gi*/ ctx[21]] + "";
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(t_value);
    			attr_dev(div, "class", "guessI svelte-y4zuf3");
    			attr_dev(div, "id", /*gi*/ ctx[21]);
    			add_location(div, file, 103, 12, 2958);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*guessBoard*/ 1 && t_value !== (t_value = /*guessBoard*/ ctx[0][/*gr*/ ctx[18]][/*gi*/ ctx[21]] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(103:10) {:else}",
    		ctx
    	});

    	return block;
    }

    // (101:89) 
    function create_if_block_1(ctx) {
    	let div;
    	let t_value = /*guessBoard*/ ctx[0][/*gr*/ ctx[18]][/*gi*/ ctx[21]] + "";
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(t_value);
    			attr_dev(div, "class", "guessI yellow svelte-y4zuf3");
    			attr_dev(div, "id", /*gi*/ ctx[21]);
    			add_location(div, file, 101, 12, 2866);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*guessBoard*/ 1 && t_value !== (t_value = /*guessBoard*/ ctx[0][/*gr*/ ctx[18]][/*gi*/ ctx[21]] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(101:89) ",
    		ctx
    	});

    	return block;
    }

    // (99:10) {#if guessBoard[gr][gi] === wordle[gi]}
    function create_if_block(ctx) {
    	let div;
    	let t_value = /*guessBoard*/ ctx[0][/*gr*/ ctx[18]][/*gi*/ ctx[21]] + "";
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(t_value);
    			attr_dev(div, "class", "guessI green svelte-y4zuf3");
    			attr_dev(div, "id", /*gi*/ ctx[21]);
    			add_location(div, file, 99, 12, 2703);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*guessBoard*/ 1 && t_value !== (t_value = /*guessBoard*/ ctx[0][/*gr*/ ctx[18]][/*gi*/ ctx[21]] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(99:10) {#if guessBoard[gr][gi] === wordle[gi]}",
    		ctx
    	});

    	return block;
    }

    // (98:8) {#each guessRow as guessI, gi}
    function create_each_block_1(ctx) {
    	let show_if;
    	let if_block_anchor;

    	function select_block_type_2(ctx, dirty) {
    		if (dirty & /*guessBoard, wordle*/ 3) show_if = null;
    		if (/*guessBoard*/ ctx[0][/*gr*/ ctx[18]][/*gi*/ ctx[21]] === /*wordle*/ ctx[1][/*gi*/ ctx[21]]) return create_if_block;
    		if (show_if == null) show_if = !!(/*guessBoard*/ ctx[0][/*gr*/ ctx[18]][/*gi*/ ctx[21]] !== "" && /*wordle*/ ctx[1].indexOf(/*guessBoard*/ ctx[0][/*gr*/ ctx[18]][/*gi*/ ctx[21]]) >= 0);
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
    		source: "(98:8) {#each guessRow as guessI, gi}",
    		ctx
    	});

    	return block;
    }

    // (96:4) {#each guessBoard as guessRow, gr}
    function create_each_block(ctx) {
    	let div;
    	let t;
    	let each_value_1 = /*guessRow*/ ctx[16];
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
    			attr_dev(div, "class", "guessRow svelte-y4zuf3");
    			attr_dev(div, "id", /*gr*/ ctx[18]);
    			add_location(div, file, 96, 6, 2571);
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
    				each_value_1 = /*guessRow*/ ctx[16];
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
    		source: "(96:4) {#each guessBoard as guessRow, gr}",
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
    	let button0;
    	let t4;
    	let button1;
    	let t6;
    	let div1;
    	let mounted;
    	let dispose;
    	let each_value_2 = /*ALPHABET*/ ctx[2];
    	validate_each_argument(each_value_2);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_1[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let each_value = /*guessBoard*/ ctx[0];
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
    			button0 = element("button");
    			button0.textContent = "Back";
    			t4 = space();
    			button1 = element("button");
    			button1.textContent = "Reset";
    			t6 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(h1, "class", "svelte-y4zuf3");
    			add_location(h1, file, 70, 2, 1561);
    			attr_dev(div0, "class", "keyboard svelte-y4zuf3");
    			add_location(div0, file, 71, 2, 1579);
    			attr_dev(button0, "id", "backButton");
    			attr_dev(button0, "type", "text");
    			attr_dev(button0, "class", "svelte-y4zuf3");
    			add_location(button0, file, 90, 2, 2272);
    			attr_dev(button1, "id", "resetButton");
    			attr_dev(button1, "type", "submit");
    			attr_dev(button1, "class", "svelte-y4zuf3");
    			add_location(button1, file, 91, 2, 2340);
    			attr_dev(div1, "class", "gridContainer svelte-y4zuf3");
    			add_location(div1, file, 94, 2, 2498);
    			attr_dev(main, "class", "svelte-y4zuf3");
    			add_location(main, file, 69, 0, 1552);
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
    			append_dev(main, button0);
    			append_dev(main, t4);
    			append_dev(main, button1);
    			append_dev(main, t6);
    			append_dev(main, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			if (!mounted) {
    				dispose = [
    					listen_dev(window, "keydown", /*handleKeydown*/ ctx[4], false, false, false),
    					listen_dev(button0, "click", /*undo*/ ctx[5], false, false, false),
    					listen_dev(button1, "click", /*reset*/ ctx[6], false, false, false)
    				];

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
    				each_value = /*guessBoard*/ ctx[0];
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
    			run_all(dispose);
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
    	const ALPHABET = ("QWERTYUIOPASDFGHJKLZXCVBNM").split("");
    	let letterCount = 0;
    	let wordCount = 0;

    	let guessBoard = [
    		["", "", "", "", ""],
    		["", "", "", "", ""],
    		["", "", "", "", ""],
    		["", "", "", "", ""],
    		["", "", "", "", ""],
    		["", "", "", "", ""]
    	];

    	const rando = (min, max) => {
    		return Math.floor(Math.random() * (max - min + 1) + min);
    	};

    	const pickWordle = () => {
    		return wordles[rando(1, 500)].toUpperCase();
    	};

    	let wordle = pickWordle();

    	const add = letter => {
    		$$invalidate(0, guessBoard[wordCount][letterCount] = letter, guessBoard);
    		letterCount++;

    		if (letterCount % 5 === 0) {
    			wordCount++;
    			letterCount = 0;
    		}
    	};

    	let key;
    	let keyCode;

    	const handleKeydown = event => {
    		key = event.key.toUpperCase();
    		keyCode = event.keyCode;

    		if (ALPHABET.indexOf(key) >= 0) {
    			add(key);
    		} else if (key === "BACKSPACE") {
    			undo();
    		} else if (key === "ENTER") {
    			reset();
    		}
    	};

    	const undo = () => {
    		if (letterCount === 0) {
    			letterCount = 4;
    			wordCount--;
    		} else {
    			letterCount--;
    		}

    		$$invalidate(0, guessBoard[wordCount][letterCount] = "", guessBoard);
    	};

    	const reset = () => {
    		letterCount = 0;
    		wordCount = 0;

    		$$invalidate(0, guessBoard = [
    			["", "", "", "", ""],
    			["", "", "", "", ""],
    			["", "", "", "", ""],
    			["", "", "", "", ""],
    			["", "", "", "", ""],
    			["", "", "", "", ""]
    		]);

    		$$invalidate(1, wordle = pickWordle());
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const click_handler = letter => add(letter);
    	const click_handler_1 = letter => add(letter);
    	const click_handler_2 = letter => add(letter);

    	$$self.$capture_state = () => ({
    		wordles,
    		ALPHABET,
    		letterCount,
    		wordCount,
    		guessBoard,
    		rando,
    		pickWordle,
    		wordle,
    		add,
    		key,
    		keyCode,
    		handleKeydown,
    		undo,
    		reset
    	});

    	$$self.$inject_state = $$props => {
    		if ('letterCount' in $$props) letterCount = $$props.letterCount;
    		if ('wordCount' in $$props) wordCount = $$props.wordCount;
    		if ('guessBoard' in $$props) $$invalidate(0, guessBoard = $$props.guessBoard);
    		if ('wordle' in $$props) $$invalidate(1, wordle = $$props.wordle);
    		if ('key' in $$props) key = $$props.key;
    		if ('keyCode' in $$props) keyCode = $$props.keyCode;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		guessBoard,
    		wordle,
    		ALPHABET,
    		add,
    		handleKeydown,
    		undo,
    		reset,
    		click_handler,
    		click_handler_1,
    		click_handler_2
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
