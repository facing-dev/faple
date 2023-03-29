import { v4 as uuidV4 } from 'uuid'
import type { VNodeInstanceRoot } from '../vdom/vnode'
import type { Faple } from '../faple'
import { PrototypeSlot } from '../decorator/propertySlot'
import Logger from '../logger'
import * as Observer from '@vue/reactivity'
class Slot {
    constructor(ins: Component) {
        this.instance = ins
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
    faple?: Faple
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
            instance:this.instance,
            type: 'INSTANCE_ROOT'
        }
        this.instance.beforeRender(vNode)
        this.vNodeOld = this.vNode
        this.vNode = vNode
    }
    renderSync() {
        this.faple!.updateComponent(this.instance)
    }
    render() {
        if (!this.faple) {
            throw 'slot.faple is undefined'
        }
        this.faple.scheduler.scheduleRender(() => this.renderSync(), this.instance)
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
    destroyed() {
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
    constructor() {
        Object.defineProperty(this, '$$__slot', {
            value: new Slot(this),
            enumerable: false,
            configurable: false,
            writable: false
        })
    }
    $render() {
        this.__slot.render()
    }
    $nextTick(cb: Function) {
        this.__slot.faple!.scheduler.scheduleNextTick(this, cb)
    }
    $release() {
        this.__slot.faple!.releaseComponent(this)
    }
    mounted(): void | Promise<any> {

    }
    beforeRender(vnode: VNodeInstanceRoot) {

    }
}
export type ComponentConstructor<T extends Component = any> = { new(): T }

