import { v4 as uuidV4 } from 'uuid'
import { VNodeInstanceRoot, VNodeElement, makeVNode } from '../vdom/vnode.mjs'
import type { FapleImpl } from '../fapleImpl/fapleImpl.mjs'
import Logger from '../logger.mjs'
import * as Observer from '@vue/reactivity'
import recursiveFree from 'recursive-free'
import { Metadata } from 'facing-metadata'
import { PrototypeMeta } from '../decorator/propertySlot.mjs'
const Meta = new Metadata<{
    slot: Slot
}>(Symbol('faple-component'))

interface WatchDeepFunction {
    (): void
}
function isObject(obj: any) {
    return typeof obj === 'object' && obj !== null
}
const watchDeepTraverse = recursiveFree<{ value: any, seen?: Set<any> }, any>(function* (opt) {

    opt.seen ??= new Set
    const { value, seen } = opt
    if (!isObject(value) || seen.has(value)) {
        return value

    }

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
    constructor(ins: Component, fapleImpl: FapleImpl) {
        this.instance = ins
        this.fapleImpl = fapleImpl
        this.hEffect = Observer.effect(() => {
            this.h()
        }, {
            lazy: true,
            scheduler: () => {
                this.scheduleRender()
            }
        })

    }
    id = uuidV4()
    vNode?: VNodeInstanceRoot
    vNodeEl?: VNodeElement
    vNodeElOld?: VNodeElement
    fapleImpl: FapleImpl
    instance: Component
    hEffect: Observer.ReactiveEffectRunner
    watchEffects?: Observer.ReactiveEffectRunner[]
    h() {
        const prototypeSlot = this.instance.$$prototypeSlot
        if (!prototypeSlot.renderer) {
            Logger.error('slot.renderer is undefined')
            throw ''
        }
        const renderer = prototypeSlot.renderer
        const vNodeElement = renderer.apply(this.instance)
        if (!vNodeElement) {
            throw ''
        }
        this.vNode ??= makeVNode({
            type: 'INSTANCE_ROOT',
            instance: this.instance,
            previousVNodeInstanceReference: undefined,
            currentVNodeInstanceReference: undefined,
            elVNode: vNodeElement
        })
        this.vNode.elVNode = vNodeElement
        this.instance.beforeRender(this.vNode.elVNode)
        this.vNodeElOld = this.vNodeEl
        this.vNodeEl = vNodeElement
    }
    renderSync() {
        this.fapleImpl.updateComponent(this.instance)
    }
    scheduleRender(cb?: (opt: boolean) => void) {
        if (this.instance.$preventScheduleRender) {
            cb?.(false)
            return false
        }
        this.fapleImpl.scheduler.scheduleRender(() => {
            this.renderSync()
            cb?.(true)
        }, this.instance)
        return true
    }

    render(shouldReturnPromise: true): Promise<boolean>
    render(shouldReturnPromise?: false): boolean
    render(shouldReturnPromise?: boolean): Promise<boolean> | boolean {
        const work = (cb?: (opt: boolean) => void) => {
            return this.scheduleRender(cb)
        }
        if (shouldReturnPromise) {
            return new Promise<boolean>((res) => {
                work((opt) => res(opt))
            })
        } else {
            return work()
        }
    }
    beforeMount() {
        const ins = this.instance
        const insAny = ins as any
        const bindKeys = ins.$$prototypeSlot.bindKeys
        if (bindKeys && bindKeys.size > 0) {
            for (const key of bindKeys.values()) {
                insAny[key] = insAny[key].bind(ins)
            }
        }
        ins.$$prototypeSlots.forEach(slot => {
            const reactiveKeys = slot.reactiveKeys
            if (reactiveKeys && reactiveKeys.size > 0) {
                for (const key of reactiveKeys.values()) {
                    const proxied = Observer.reactive((insAny[key]));
                    insAny[key] = proxied
                }
            }
        })

        // const watchKeys = ins.$$prototypeSlot.watchKeys
        // if (watchKeys && watchKeys.size > 0) {
        //     for (const key of watchKeys.values()) {
        //         this.watchEffects ??= []
        //         this.watchEffects.push(Observer.effect(() => {
        //             insAny[key]()
        //         }, {
        //             lazy: true
        //         }))
        //     }
        // }
    }
    isAfterMounted = false
    afterMounted() {
        this.watchEffects?.forEach(e => {
            e.effect.run()
        })
        this.isAfterMounted = true
    }
    watchDeep(obj: any, fn: WatchDeepFunction, opt?: {
        /**
         * default false
         */
        immediate?: boolean
    }) {
        const immediate = opt?.immediate ?? false
        let runCount = 0
        this.watchEffects ??= []
        this.watchEffects.push(Observer.effect(() => {
            runCount++
            watchDeepTraverse({ value: obj })
            if (runCount === 1) {//call in afterMounted or immediately
                if (immediate) {
                    fn()
                }
                return
            }
            fn()
        }, {
            lazy: this.isAfterMounted ? false : true
        }))
    }
    destroy() {

        this.hEffect?.effect.stop()
        this.watchEffects?.forEach(e => {
            e.effect.stop()
        })
    }
}

export abstract class Component<Props extends Record<string, any> = Record<string, any>> {
    properties!: Props & {
        key?: any
    }
    get $$slot() {
        const slot = Meta.getOwn(this)?.slot
        if (!slot) {
            throw 'no slot'
        }
        return slot
    }

    get $$prototypeSlot() {
        const slot = PrototypeMeta.get(this)?.slot
        if (!slot) {
            throw 'no prototype slot'
        }
        return slot
    }
    get $$prototypeSlots() {
        const slots = PrototypeMeta.getAll(this)?.map(ite => ite.slot)
        if (!slots) {
            throw 'no prototype slot'
        }
        return slots
    }
    constructor(fapleImpl: FapleImpl) {
        Meta.create(this, {
            slot: new Slot(this, fapleImpl)
        })
    }

    $render(shouldReturnPromise: true): Promise<boolean>
    $render(shouldReturnPromise?: false): boolean
    $render(shouldReturnPromise?: boolean): Promise<boolean> | boolean {
        if (shouldReturnPromise) {
            return this.$$slot.render(shouldReturnPromise)
        }
        return this.$$slot.render(shouldReturnPromise)
    }
    $renderSync() {
        this.$$slot.renderSync()
    }
    $nextTick(cb: Function, uniqueId?: string) {
        this.$$slot.fapleImpl.scheduler.scheduleNextTick(cb)
    }
    $nextTickLowPriority(cb: Function, uniqueId?: string) {
        this.$$slot.fapleImpl.scheduler.scheduleLowPriority(cb)
    }
    $release() {
        this.$$slot.fapleImpl.releaseComponent(this)
    }
    $reactive<T extends object>(obj: T) {
        return Observer.reactive(obj)
    }
    $watchDeep(obj: any, fn: WatchDeepFunction, opt?: {
        /**
         * default false
         */
        immediate?: boolean
    }) {
        this.$$slot.watchDeep(obj, fn, opt)
    }

    get $el() {
        return this.$$slot.vNode?.elVNode.node
    }
    mounted(): void | Promise<any> {

    }
    beforeRender(vnode: VNodeElement) {
    }
    beforeDestroy() { }
    $preventScheduleRender = false
}
export type ComponentConstructor<T extends Component = Component> = { new(...args: ConstructorParameters<typeof Component>): T }

