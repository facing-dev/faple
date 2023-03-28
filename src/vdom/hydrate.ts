export function isValidNode(node: Node): node is (HTMLElement | Text) {
    if (isElementNode(node) || isTextNode(node)) {
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

export function getValideChildren(node: HTMLElement): Array<HTMLElement | Text> {
    return Array.from(node.childNodes.values()).filter((node): node is (HTMLElement | Text) => isValidNode(node))
}