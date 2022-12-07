!(function () {


    function makeHookedFn(fn, prefix, postfix) {
        return function () {
            if (prefix) {
                let prefixRes = prefix.call(this, ...arguments)
                if (prefixRes != undefined) return prefixRes;
            }

            let realRes = fn.call(this, ...arguments);

            if (postfix) {
                let postfixRes = postfix.call(this, realRes, ...arguments);
                if (postfixRes != undefined) return postfixRes;
            }

            return realRes
        }
    }

    function logObject(title, obj) {
        console.log(title, obj);
    }

    window.__MOREHOOKS__ = {
        ipc: {
            showLogs: false,
            debuggerTriggerCalls: [],
            registeredCallbacks: {},
        },
        events: {
            callbacks: {},
            replayers: {},
            listeners: {}
        }
    }


    let originChannelCall = channel.call;
    channel.call = function (...args) {


        if (__MOREHOOKS__.ipc.debuggerTriggerCalls.includes(args[0])) debugger
        originChannelCall.call(this, ...args);

        if (__MOREHOOKS__.ipc.showLogs)
            logObject("[IPCHook] [channel.call] " + args[0], {
                callback: args[1],
                args: args[2]
            })
    }

    let originChannelRegCall = channel.registerCall;
    channel.registerCall = function (...args) {
        __MOREHOOKS__.ipc.registeredCallbacks[args[0]] = {
            source: args[1],
            replayer: () => { args[1].call(this, ...arguments) }
        }
        originChannelRegCall.call(this, args[0], function () {
            if (__MOREHOOKS__.ipc.showLogs)
                console.log("[IPCHook] [callback] ", args[0], ...arguments);
            args[1].call(this, ...arguments)
        });

        if (__MOREHOOKS__.ipc.showLogs)
            logObject("[IPCHook] [channel.registerCall] " + args[0], {
                callback: args[1]
            })
    }



    window._REAL_NEJ = {}
    window.NEJ = new Proxy(_REAL_NEJ, {
        set(target, p, nv, rec) {
            if (nv.toString().includes("window")) {
                // NEJ.P
                let sourceFunc = nv;
                nv = function (name) {

                    if (name === "nej.v") {
                        return new Proxy(nv, {
                            get(target, key, r) {
                                if (target[key].toString().includes("!bg.stopped")) {
                                    return function (fn, name, arg) {

                                        if (typeof name === "string")
                                            __MOREHOOKS__.events.replayers[name] = (arg) => {
                                                target[key].call(this, fn, name, arg)
                                            }

                                        for (let key in fn) {
                                            if (key.startsWith("on")) __MOREHOOKS__.events.callbacks[key] ||= fn[key]
                                        }


                                        let result = target[key].call(this, fn, name, arg);

                                        if (__MOREHOOKS__.events.listeners[name]) {
                                            for (let listener of __MOREHOOKS__.events.listeners[name]) {
                                                listener(arg, result);
                                            }
                                        }

                                        return result
                                    }
                                }
                                return Reflect.get(...arguments);
                            }
                        })
                    }

                    return sourceFunc.call(this, ...arguments)
                }
            }
            return Reflect.set(target, p, nv, rec);
        }
    })

    // Object.setPrototypeOf(Function.prototype, new Proxy({}, {
    //     set(target, prop, nv, receiver) {
    //         if (prop.length <= 2 && typeof nv === "function" && nv.toString().includes("NEJ.R.slice.call")) {
    //             // console.log(makeHookedFn(nv, console.log), nv, prop)
    //             nv = makeHookedFn(nv, function (_, name) {
    //                 if (typeof name === "string") {
    //                     // if (this.toString().includes("select_file_and_dir"))
    //                     console.log(name, this.toString(), ...arguments)
    //                 }

    //             }, (res) => makeHookedFn(res));
    //         }
    //         return Reflect.set(target, prop, nv, receiver);
    //     }
    // }))

})()