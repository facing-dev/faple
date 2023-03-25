import { Scheduler as SchedulerBase, Record } from '@facing/scheduler'
const LayerName_Mounted = 'LayerName_Mounted'
const LayerName_Render = 'LayerName_Render'
const LayerName_NextTick = 'LayerName_NextTick'
import type { Component } from './component/component'
import type { Faple } from './faple'
export class Scheduler extends SchedulerBase {

    renderComponents: Set<Component> = new Set
    faple: Faple
    constructor(faple: Faple) {
        super()
        this.faple = faple
        this.createLayer(LayerName_Mounted)
        this.createLayer(LayerName_Render)
        this.createLayer(LayerName_NextTick)

    }
    private getLayerMounted() {
        return this.getLayer(LayerName_Mounted)!
    }
    private getLayerRender() {
        return this.getLayer(LayerName_Render)!
    }
    private getLayerNextTick() {
        return this.getLayer(LayerName_NextTick)!
    }

    scheduleMounted(comp: Component) {
        this.getLayerMounted().records.add(comp.mounted.bind(comp), null)
        // console.log('z', this.getLayerMounted())
        this.schedule()
    }
    scheduleRender(comp: Component) {
        this.getLayerRender().records.add(() => {
            this.faple.updateComponent(comp)
        }, null, comp)
        this.schedule()
    }
    scheduleNextTick(comp: Component, cb: Function) {
        this.getLayerNextTick().records.add(cb.bind(comp), null)
        this.schedule()
    }
}