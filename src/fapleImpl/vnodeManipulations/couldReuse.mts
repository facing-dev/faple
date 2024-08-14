import Logger from '../../logger.mjs'
import type { VNode } from "../../vdom/vnode.mjs"
export function couldReuse(oldVNode: VNode, newVNode: VNode) {

    if (oldVNode.type !== newVNode.type) {
        return false
    }
    if (oldVNode.type === 'ELEMENT' && newVNode.type === 'ELEMENT') {
        if (oldVNode.tag !== newVNode.tag) {
            return false
        }
        if (oldVNode.key !== newVNode.key) {
            return false
        }
    }
    if (oldVNode.type === 'INSTANCE_REFERENCE' && newVNode.type === 'INSTANCE_REFERENCE') {
        if (oldVNode.vNodeInstanceRoot.instance !== newVNode.vNodeInstanceRoot.instance) {
            return false
        }
    }
    if (oldVNode.type === 'INSTANCE_ROOT' && newVNode.type === 'INSTANCE_ROOT') {
        if (oldVNode.instance !== newVNode.instance) {
            Logger.error('INSTANCE_ROOT vnode must have same instance in couldReuse()')
            throw ''
        }
        if (newVNode.elVNode.tag !== oldVNode.elVNode.tag) {
            Logger.error('INSTANCE_ROOT vnode must have same element tag in couldReuse()')
            throw ''
        }
    }
    if (oldVNode.type === 'CONSTRUCTOR' && newVNode.type === 'CONSTRUCTOR') {
        if (oldVNode.constructor !== newVNode.constructor) {
            return false
        }
        if (oldVNode.key !== newVNode.key) {
            return false
        }
    }
    return true
}