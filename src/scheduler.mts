import { Scheduler as SchedulerBase } from '@facing/scheduler'
// const LayerName_BeforeMount = 'LayerName_BeforeMount'
const LayerName_Mounted = 'LayerName_Mounted'
const LayerName_Render = 'LayerName_Render'
const LayerName_NextTick = 'LayerName_NextTick'
const LayerName_WaitMounted = 'LayerName_WaitMounted'
const LayerName_LowPriority = 'LayerName_LowPriority'
import type { Component } from './component/component.mjs'
export class Scheduler extends SchedulerBase {

    renderComponents: Set<Component> = new Set

    constructor() {
        super()

        // this.createLayer(LayerName_BeforeMount)
        this.createLayer(LayerName_Mounted)
        this.createLayer(LayerName_Render)
        this.createLayer(LayerName_NextTick)
        this.createLayer(LayerName_WaitMounted)
        this.createLayer(LayerName_LowPriority)

    }
    // private getLayerBeforeMount(){
    //     return this.getLayer(LayerName_BeforeMount)!
    // }
    private getLayerMounted() {
        return this.getLayer(LayerName_Mounted)!
    }
    private getLayerRender() {
        return this.getLayer(LayerName_Render)!
    }
    private getLayerNextTick() {
        return this.getLayer(LayerName_NextTick)!
    }

    private getLayerWaitMounted() {
        return this.getLayer(LayerName_WaitMounted)!
    }
    private getLayerLowPriority() {
        return this.getLayer(LayerName_LowPriority)!
    }
    // scheduleBeforeMount(cb:Function){
    //     this.getLayerBeforeMount().records.add(cb,null)
    //     this.schedule()

    // }
    scheduleMounted(cb: Function) {
        this.getLayerMounted().records.add(cb, null)
        this.schedule()
    }
    scheduleRender(cb: Function, comp: Component) {
        this.getLayerRender().records.add(cb, null, comp)
        this.schedule()
    }
    scheduleNextTick(cb: Function,uniqueId?:string) {
        this.getLayerNextTick().records.add(cb, null,uniqueId)
        this.schedule()
    }
    scheduleWaitMounted(cb: Function) {
        this.getLayerWaitMounted().records.add(cb, null)
    }
    scheduleLowPriority(cb: Function, uniqueId?: string) {
        this.getLayerLowPriority().records.add(cb, null, uniqueId)
        this.schedule()
    }
}