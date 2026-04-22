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

  get length() {
    return this.#size;
  }
}

module.exports = { SLL };