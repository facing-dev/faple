import recursiveFree from "recursive-free"
import Logger from "../../logger.mjs"
import type { FapleImpl } from "../fapleImpl.mjs"
import type { VNodeInstanceRoot, VNode } from "../../vdom/vnode.mjs"
export function releaseVNodeInstanveRoot(vNode: VNodeInstanceRoot, deleteElement: boolean, fapleImpl: FapleImpl) {
    const rec = recursiveFree<VNode, void>(function* (vNode) {
        if (vNode.type === 'CONSTRUCTOR') {
            releaseVNodeInstanveRoot(vNode.instance!.$$slot.vNode!, false, fapleImpl)
        }
        if (vNode.type !== 'INSTANCE_ROOT' && vNode.type !== 'ELEMENT') {
            return
        }
        for (const n of (vNode.type === 'ELEMENT' ? vNode.children : vNode.elVNode.children) ?? []) {
            yield n
        }
    })
    rec(vNode)


    const comp = vNode.instance!
    fapleImpl.components.delete(comp.$$slot.id)
    comp.beforeDestroy()
    comp.$$slot.destroy()
    if (deleteElement) {
        vNode.elVNode.node!.remove()
    }
}

export function releaseVNode(vNode: VNode, fapleImpl: FapleImpl) {


    if (vNode.type === 'INSTANCE_ROOT') {
        Logger.error('Can not remove an instance root\'s dom')
        throw ''
    } else if (vNode.type === 'INSTANCE_REFERENCE') {
        vNode.vNodeInstanceRoot.elVNode.node!.remove()
    } else if (vNode.type === 'CONSTRUCTOR') {
        const vNodeRoot = vNode.instance?.$$slot.vNode

        if (!vNodeRoot || !vNodeRoot.elVNode.node) {
            throw ''
        }
        releaseVNodeInstanveRoot(vNodeRoot, true, fapleImpl)



    } else {
        vNode.node!.remove()
    }
}