/*
 * Copyright 2022 The Emscripten Authors.  All rights reserved.
 * Emscripten is available under two separate licenses, the MIT license and the
 * University of Illinois/NCSA Open Source License.  Both these licenses can be
 * found in the LICENSE file.
 */
#include <assert.h>
#include <errno.h>
#include <malloc.h>
#include <stdbool.h>
#include <stdlib.h>
#include <string.h>
#include <sys/mman.h>

#include <emscripten/heap.h>
#include <emscripten/emmalloc.h>

#include "lock.h"
#include "syscall.h"

struct map {
  void* addr;
  long length;
  int allocated;
  int fd;
  int flags;
  off_t offset;
  int prot;
  struct map* next;
} __attribute__((aligned (1)));

// Linked list of all mapping, guarded by a musl-style lock (LOCK/UNLOCK)
static volatile int lock[1];
static struct map* mappings;

// JS library functions.  Used only when mapping files (not MAP_ANONYMOUS)
long _mmap_js(long addr, long length, long prot, long flags, long fd, long offset, int* allocated);
long _munmap_js(long addr, long length, long prot, long flags, long fd, long offset);
long _msync_js(long addr, long length, long flags, long fd);

static struct map* find_mapping(long addr, struct map** prev) {
  struct map* map = mappings;
  while (map) {
    if (map->addr == (void*)addr) {
      return map;
    }
    if (prev) {
      *prev = map;
    }
    map = map->next;
  }
  return map;
}

int __syscall_munmap(long addr, long length) {
  LOCK(lock);
  struct map* prev = NULL;
  struct map* map = find_mapping(addr, &prev);
  if (!map || !length) {
    UNLOCK(lock);
    return -EINVAL;
  }

  // We don't support partial munmapping.
  if (map->length != length) {
    UNLOCK(lock);
    return -EINVAL;
  }

  // Remove map from linked list
  if (prev) {
    prev->next = map->next;
  } else {
    mappings = map->next;
  }
  UNLOCK(lock);

  if (!(map->flags & MAP_ANONYMOUS)) {
    int rtn = _munmap_js(addr, length, map->prot, map->flags, map->fd, map->offset);
    if (rtn) {
      return rtn;
    }
  }

  // Release the memory.
  if (map->allocated) {
    emscripten_builtin_free(map->addr);
  }

  if (!(map->flags & MAP_ANONYMOUS)) {
    emscripten_builtin_free(map);
  }

  // Success!
  return 0;
}

int __syscall_msync(long addr, long len, long flags) {
  LOCK(lock);
  struct map* map = find_mapping(addr, NULL);
  UNLOCK(lock);
  if (!map) {
    return -EINVAL;
  }
  if (map->flags & MAP_ANONYMOUS) {
    return 0;
  }
  return _msync_js(addr, len, map->flags, map->fd);
}

int __syscall_mmap2(long addr, long len, long prot, long flags, long fd, long off) {
  // addr argument must be page aligned if MAP_FIXED flag is set.
  if (flags & MAP_FIXED && (addr % WASM_PAGE_SIZE) != 0) {
    return -EINVAL;
  }

  off *= SYSCALL_MMAP2_UNIT;
  struct map* new_map;

  // MAP_ANONYMOUS (aka MAP_ANON) isn't actually defined by POSIX spec,
  // but it is widely used way to allocate memory pages on Linux, BSD and Mac.
  // In this case fd argument is ignored.
  if (flags & MAP_ANONYMOUS) {
    // For anonymous maps, allocate that mapping at the end of the region.
    void* ptr = emscripten_builtin_memalign(WASM_PAGE_SIZE, len + sizeof(struct map));
    if (!ptr) {
      return -ENOMEM;
    }
    memset(ptr, 0, len);
    new_map = (struct map*)((char*)ptr + len);
    new_map->addr = ptr;
    new_map->fd = -1;
    new_map->allocated = true;
  } else {
    new_map = emscripten_builtin_malloc(sizeof(struct map));
    long rtn = _mmap_js(addr, len, prot, flags, fd, off, &new_map->allocated);
    if (rtn < 0) {
      emscripten_builtin_free(new_map);
      return rtn;
    }
    new_map->addr = (void*)rtn;
    new_map->fd = fd;
  }

  new_map->length = len;
  new_map->flags = flags;
  new_map->offset = off;
  new_map->prot = prot;

  LOCK(lock);
  new_map->next = mappings;
  mappings = new_map;
  UNLOCK(lock);

  return (long)new_map->addr;
}
