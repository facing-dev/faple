import { Scheduler as SchedulerBase } from '@facing/scheduler'
// const LayerName_BeforeMount = 'LayerName_BeforeMount'
const LayerName_Mounted = 'LayerName_Mounted'
const LayerName_Render = 'LayerName_Render'
const LayerName_NextTick = 'LayerName_NextTick'
const LayerName_WaitMounted = 'LayerName_WaitMounted'
import type { Component } from './component/component'
import type { Faple } from './faple'
export class Scheduler extends SchedulerBase {

    renderComponents: Set<Component> = new Set
    faple: Faple
    constructor(faple: Faple) {
        super()
        this.faple = faple
        // this.createLayer(LayerName_BeforeMount)
        this.createLayer(LayerName_Mounted)
        this.createLayer(LayerName_Render)
        this.createLayer(LayerName_NextTick)
        this.createLayer(LayerName_WaitMounted)

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

    private getLayerWaitMounted(){
        return this.getLayer(LayerName_WaitMounted)!
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
    scheduleNextTick(comp: Component, cb: Function) {
        this.getLayerNextTick().records.add(cb.bind(comp), null)
        this.schedule()
    }
    scheduleWaitMounted(cb:Function){
        this.getLayerWaitMounted().records.add(cb,null)
    }
}