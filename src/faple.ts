import type { VNodeInstanceRoot } from './vdom/vnode'
import { Component, type ComponentConstructor } from './component/component'
import { FapleImpl } from './fapleImpl/fapleImpl'


export class Faple {
    #fapleImpl: FapleImpl
    get fapleImpl(){
        return this.#fapleImpl
    }
    constructor(scopeEl?: HTMLElement) {
        this.#fapleImpl = new FapleImpl(scopeEl)

    }


    waitComponentsMounted(cb: Function) {
        return this.#fapleImpl.waitComponentsMounted(cb)
    }
    instantiateComponent<COMP extends Component>(cons: ComponentConstructor<COMP>): COMP {
        return this.#fapleImpl.instantiateComponent(cons)
    }

    initializeComponent<T extends Component>(comp: T, reuseEl?: HTMLElement): T {
        return this.#fapleImpl.initializeComponent(comp, reuseEl)
    }
    updateComponent(comp: Component) {
        return this.#fapleImpl.updateComponent(comp)
    }

    mount<COMP extends Component>(compOrCons:COMP|ComponentConstructor<COMP>,reuseEl?:HTMLElement){
        if(typeof compOrCons==='function'){
            compOrCons=this.instantiateComponent(compOrCons)
        }
        return this.initializeComponent(compOrCons,reuseEl)
    }
    /**
     * not recursive
     */
    releaseComponent(comp: Component, deleteEl = false) {
        this.#fapleImpl.releaseComponent(comp, deleteEl)
    }
    getComponentByElement(el: HTMLElement): any {
        return this.#fapleImpl.getComponentByElement(el)
    }
    renderString(component: Component, opt?: {
        style?: boolean,
        class?: boolean,
        ignoreAttributes?: string[]
        vnodeModifier?: (vnode: VNodeInstanceRoot) => void
    }) {
        return this.#fapleImpl.renderString(component, opt)
    }
}

