#!/usr/bin/env node
// Copyright 2021 The Emscripten Authors.  All rights reserved.
// Emscripten is available under two separate licenses, the MIT license and the
// University of Illinois/NCSA Open Source License.  Both these licenses can be
// found in the LICENSE file.

'use strict';

const fs = require('fs')
const path = require('path')
const { copyDirSync } = require('./copy_directory')

const scriptDir = __dirname
const emscriptenRoot = path.join(scriptDir, '../..')
const defaultLLVMDir = path.join(emscriptenRoot, '../llvm-project')
const localSrc = path.join(scriptDir, 'compiler-rt')

const copyDirs = [
    'include/sanitizer',
    'lib/sanitizer_common',
    'lib/asan',
    'lib/interception',
    'lib/builtins',
    'lib/lsan',
    'lib/ubsan',
    'lib/ubsan_minimal',
]

const preserveFiles = ['readme.txt']
const ignoreFiles = [
    '.clang-format',
    'CMakeLists.txt',
    'README.txt',
    'weak_symbols.txt',
]


function clear(dirname) {
    for (const f of fs.readdirSync(dirname)) {
        if (preserveFiles.includes(f) || f.includes('emscripten'))
            continue
        const full = path.join(dirname, f)
        fs.rmSync(full, {recursive: true, force: true})
    }
}

function assertPathsExist(...paths) {
    for (const path of path) {
        if (!fs.existsSync(path)) {
            console.log(`${path} not found`)
            process.exit(1)
        }
    }
}


const llvmDir = process.argv.length > 1 ?
    path.resolve(process.argv[1]) : defaultLLVMDir
const upstreamDir = path.join(llvmDir, 'compiler-rt')
const upstreamSrc = path.join(upstreamDir, 'lib/builtins')
const upstreamInclude = path.join(upstreamDir, 'include/sanitizer')
assertPathsExist(upstreamDir, upstreamSrc, upstreamInclude)

for (const dirname in copyDirs) {
    const srcDir = path.join(upstreamDir, dirname)
    assertPathsExist(srcDir)

    const destDir = path.join(localSrc, dirname)
    clear(destDir)

    for (const name of fs.readdirSync(srcDir)) {
        if (ignoreFiles.includes(name))
            continue
        if (name.endsWith('.syms.extra') || name.endsWith('.S'))
            continue
        
        const fullDir = path.join(srcDir, name)
        if (fs.statSync(fullDir).isFile)
            fs.copyFileSync(fullDir, destDir)
    }
}

fs.copyFileSync(path.join(upstreamDir, 'CREDITS.TXT'), localSrc)
fs.copyFileSync(path.join(upstreamDir, 'LICENSE.TXT'), localSrc)
