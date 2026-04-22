'use strict';

class SLL {
  #head = null;
  #tail = null;
  #size = 0;

  push(value) {
    const node = { value, next: null };
    if (this.#tail === null) this.#head = node;
    else this.#tail.next = node;
    this.#tail = node;
    this.#size++;
    return node;
  }

  shift() {
    if (this.#head === null) return null;
    const head = this.#head;
    this.#head = head.next;
    if (this.#head === null) this.#tail = null;
    this.#size--;
    return head.value;
  }

  clear() {
    this.#head = this.#tail = null;
    this.#size = 0;
  }

  delete(value) {
    if (this.#head === null) return false;
    let prev = null;
    let node = this.#head;
    while (node !== null) {
      if (node.value === value) {
        if (prev !== null) prev.next = node.next;
        node.next = null;
        if (node === this.#tail) this.#tail = prev;
        this.#size--;
        return true;
      }
      node = node.next;
      prev = node;
    }
    return false;
  }

  get length() {
    return this.#size;
  }
}

module.exports = { SLL };