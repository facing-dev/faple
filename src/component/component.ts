import { v4 as uuidV4 } from 'uuid'
import type { VNodeInstanceRoot } from '../vdom/vnode'
import type { Faple } from '../faple'
import { PrototypeSlot } from '../decorator/propertySlot'
import Logger from '../logger'
import * as Observer from '@vue/reactivity'
import recursiveFree from 'recursive-free'
interface WatchDeepFunction {
    (): void
}
function isObject(obj: any) {
    return typeof obj === 'object' && obj !== null
}
const watchDeepTraverse = recursiveFree<{ value: any, seen?: Set<any> }, any>(function* (opt) {
    opt.seen ??= new Set
    const { value, seen } = opt
    if (!isObject(value) || seen.has(value))
        return value

    seen.add(value) // prevent circular reference 
    if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++)
            yield { value: value[i], seen }

    }
    else {
        for (const key of Object.keys(value))
            yield { value: value[key], seen }
    }
    return value
})

class Slot {
    constructor(ins: Component, faple: Faple) {
        this.instance = ins
        this.faple = faple
        this.hEffect = Observer.effect(() => {
            this.h()
        }, {
            lazy: true,
            scheduler: () => {
                this.faple!.scheduler.scheduleRender(() => this.renderSync(), this.instance)
            }
        })
    }
    id = uuidV4()
    vNode?: VNodeInstanceRoot
    vNodeOld?: VNodeInstanceRoot
    faple: Faple
    instance: Component
    hEffect: Observer.ReactiveEffectRunner
    watchEffects?: Observer.ReactiveEffectRunner[]
    h() {

        const prototypeSlot = this.instance.__prototypeSlot
        if (!prototypeSlot.renderer) {
            Logger.error('slot.renderer is undefined')
            throw ''
        }
        const renderer = prototypeSlot.renderer

        const vNodeElement = renderer.apply(this.instance)

        if (!vNodeElement) {
            throw ''
        }

        const vNode: VNodeInstanceRoot = {

            ...vNodeElement,
            instance: this.instance,
            type: 'INSTANCE_ROOT'
        }
        this.instance.beforeRender(vNode)

        this.vNodeOld = this.vNode
        this.vNode = vNode
    }
    renderSync() {
        this.faple!.updateComponent(this.instance)
    }
    render<T extends boolean | undefined>(shouldReturnPromise?: T): [T] extends [true] ? Promise<void> : void {
        if (!this.faple) {
            throw 'slot.faple is undefined'
        }
        const work = (cb?: Function) => {
            this.faple!.scheduler.scheduleRender(() => {
                this.renderSync()
                cb?.()
            }, this.instance)
        }
        if (shouldReturnPromise) {
            return new Promise<void>((res) => {
                work(() => res())
            }) as any
        } else {
            work()
        }
        return undefined as any
    }
    beforeMount() {
        const ins = this.instance
        Observer.markRaw(ins)
        const insAny = ins as any
        const bindKeys = ins.__prototypeSlot.bindKeys
        if (bindKeys && bindKeys.size > 0) {
            for (const key of bindKeys.values()) {
                insAny[key] = insAny[key].bind(ins)
            }
        }
        const reactiveKeys = ins.__prototypeSlot.reactiveKeys
        if (reactiveKeys && reactiveKeys.size > 0) {
            for (const key of reactiveKeys.values()) {
                const proxied = Observer.reactive((insAny[key]));
                insAny[key] = proxied
            }
        }
        const watchKeys = ins.__prototypeSlot.watchKeys
        if (watchKeys && watchKeys.size > 0) {
            for (const key of watchKeys.values()) {
                this.watchEffects ??= []
                this.watchEffects.push(Observer.effect(() => {
                    insAny[key]()
                }, {
                    lazy: true
                }))
            }
        }
    }
    afterMounted() {
        this.watchEffects?.forEach(e => {
            e.effect.run()
        })
    }
    watchDeep(obj: any, fn: WatchDeepFunction) {
        let first = true

        this.watchEffects?.push(Observer.effect(() => {
            watchDeepTraverse(obj)
            if (!first) {
                fn()
            }
            first = false
        }))
    }
    destroy() {

        this.hEffect?.effect.stop()
        this.watchEffects?.forEach(e => {
            e.effect.stop()
        })
    }
}


export abstract class Component {
    $$__slot!: Slot
    get __slot() {
        return this.$$__slot
    }
    private __prototypeSlot_!: PrototypeSlot
    get __prototypeSlot() {
        return this.__prototypeSlot_
    }
    constructor(faple: Faple) {
        Object.defineProperty(this, '$$__slot', {
            value: new Slot(this, faple),
            enumerable: false,
            configurable: false,
            writable: false
        })
    }
    $render<T extends boolean | undefined>(shouldReturnPromise?: T): [T] extends [true] ? Promise<void> : void {
        return this.__slot.render(shouldReturnPromise)
    }
    $renderSync() {
        this.__slot.renderSync()
    }
    $nextTick(cb: Function, uniqueId?: string) {
        this.__slot.faple!.scheduler.scheduleNextTick(cb)
    }
    $nextTickLowPriority(cb: Function, uniqueId?: string) {
        this.__slot.faple!.scheduler.scheduleLowPriority(cb)
    }
    $release() {
        this.__slot.faple!.releaseComponent(this)
    }
    $reactive<T extends object>(obj: T) {
        return Observer.reactive(obj)
    }
    $watchDeep(obj: any, fn: WatchDeepFunction) {
        this.__slot.watchDeep(obj, fn)
    }

    get $el() {
        return this.$$__slot.vNode?.node
    }
    mounted(): void | Promise<any> {

    }
    beforeRender(vnode: VNodeInstanceRoot) {
    }
    beforeDestroy() { }
}
export type ComponentConstructor<T extends Component = any> = { new(): T }
