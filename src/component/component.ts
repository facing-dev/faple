import { v4 as uuidV4 } from 'uuid'
import type { VNodeInstanceRoot } from '../vdom/vnode'
import type { Faple } from '../faple'
import { PrototypeSlot } from '../decorator/propertySlot'
import Logger from '../logger'

class Slot {
    constructor(ins: Component) {
        this.instance = ins
    }
    id = uuidV4()
    vNode?: VNodeInstanceRoot
    vNodeOld?: VNodeInstanceRoot
    faple?: Faple
    instance: Component
    h() {
        const prototypeSlot = this.instance.__prototypeSlot
        if (!prototypeSlot.renderer) {
            Logger.error('slot.renderer is undefined')
            throw ''
        }
        const vNode = prototypeSlot.renderer.apply(this.instance)
        this.vNodeOld = this.vNode
        return this.vNode = vNode
    }
    render() {
        if (!this.faple) {
            throw 'slot.faple is undefined'
        }
        this.faple.scheduler.scheduleRender(this.instance)
    }
}


export abstract class Component {
    #__slot: Slot
    get __slot() {
        return this.#__slot
    }
    private __prototypeSlot_!: PrototypeSlot
    get __prototypeSlot() {
        return this.__prototypeSlot_
    }
    constructor() {
        this.#__slot = new Slot(this)
    }
    $render(){
        this.__slot.render()
    }
    $nextTick(cb:Function){
        this.__slot.faple!.scheduler.scheduleNextTick(this,cb)
    }
    mounted(){

    }
}
export type ComponentConstructor = { new(): Component }

