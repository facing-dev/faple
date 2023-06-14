

export function isValidNode(node: Node): node is (HTMLElement | Text) {
    if (isElementNode(node) || isTextNode(node) || isHydrateHolderNode(node)) {
        return true
    }
    return false
}

export function isElementNode(node: Node): node is HTMLElement {
    return node.nodeType === 1 && (node instanceof HTMLElement)
}
export function isTextNode(node: Node): node is Text {
    return node.nodeType === 3
}
export function isHydrateHolderNode(node: Node): node is Comment {
    return node.nodeType === 8 && !!Object.getOwnPropertyDescriptor(node, '__fapleHydrateHolder')
}

export function makeHydrateHolderNode() {
    const node = document.createComment('faple hydrate holder')
    Object.defineProperty(node, '__fapleHydrateHolder', {
        value: true,
        enumerable: false
    })
    return node
}

export function getValideChildren(node: HTMLElement): Array<HTMLElement | Text | Comment> {
    return Array.from(node.childNodes.values()).filter((node): node is (HTMLElement | Text | Comment) => isValidNode(node))
}