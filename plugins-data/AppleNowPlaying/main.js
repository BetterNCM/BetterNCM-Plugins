/*
 * QQ QRC decoder for AppleNowPlaying. No host playback or Node dependency.
 * Modified/ported to JavaScript on 2026-11-17 from Simple Player's
 * backend/tauri/src/modules/qrc_cipher.rs. QQ substitution tables and word order
 * originate in WXRIW/Lyricify-Lyrics-Helper, Decrypter/Qrc/DESHelper.cs.
 * Copyright 2023 XY Wang, WXRIW. SPDX-License-Identifier: Apache-2.0
 * The full Apache-2.0 license is included at the end of this file.
 * The bounded RFC 1950/1951 inflater below is an original implementation.
 */
(function (root) {
    "use strict";

    var LIMIT = 4 * 1024 * 1024;
    var S = [
        [14,4,13,1,2,15,11,8,3,10,6,12,5,9,0,7,0,15,7,4,14,2,13,1,10,6,12,11,9,5,3,8,4,1,14,8,13,6,2,11,15,12,9,7,3,10,5,0,15,12,8,2,4,9,1,7,5,11,3,14,10,0,6,13],
        [15,1,8,14,6,11,3,4,9,7,2,13,12,0,5,10,3,13,4,7,15,2,8,15,12,0,1,10,6,9,11,5,0,14,7,11,10,4,13,1,5,8,12,6,9,3,2,15,13,8,10,1,3,15,4,2,11,6,7,12,0,5,14,9],
        [10,0,9,14,6,3,15,5,1,13,12,7,11,4,2,8,13,7,0,9,3,4,6,10,2,8,5,14,12,11,15,1,13,6,4,9,8,15,3,0,11,1,2,12,5,10,14,7,1,10,13,0,6,9,8,7,4,15,14,3,11,5,2,12],
        [7,13,14,3,0,6,9,10,1,2,8,5,11,12,4,15,13,8,11,5,6,15,0,3,4,7,2,12,1,10,14,9,10,6,9,0,12,11,7,13,15,1,3,14,5,2,8,4,3,15,0,6,10,10,13,8,9,4,5,11,12,7,2,14],
        [2,12,4,1,7,10,11,6,8,5,3,15,13,0,14,9,14,11,2,12,4,7,13,1,5,0,15,10,3,9,8,6,4,2,1,11,10,13,7,8,15,9,12,5,6,3,0,14,11,8,12,7,1,14,2,13,6,15,0,9,10,4,5,3],
        [12,1,10,15,9,2,6,8,0,13,3,4,14,7,5,11,10,15,4,2,7,12,9,5,6,1,13,14,0,11,3,8,9,14,15,5,2,8,12,3,7,0,4,10,1,13,11,6,4,3,2,12,9,5,15,10,11,14,1,7,6,0,8,13],
        [4,11,2,14,15,0,8,13,3,12,9,7,5,10,6,1,13,0,11,7,4,9,1,10,14,3,5,12,2,15,8,6,1,4,11,13,12,3,7,14,10,15,6,8,0,5,9,2,6,11,13,8,1,4,10,7,9,5,0,15,14,2,3,12],
        [13,2,8,4,6,15,11,1,10,9,3,14,5,0,12,7,1,15,13,8,10,3,7,4,12,5,6,11,0,14,9,2,7,11,4,1,9,12,14,2,0,6,10,13,15,3,5,8,2,1,14,7,4,10,8,13,15,12,9,0,3,5,6,11]
    ];
    var PC1 = [57,49,41,33,25,17,9,1,58,50,42,34,26,18,10,2,59,51,43,35,27,19,11,3,60,52,44,36,63,55,47,39,31,23,15,7,62,54,46,38,30,22,14,6,61,53,45,37,29,21,13,5,28,20,12,4];
    var PC2 = [14,17,11,24,1,5,3,28,15,6,21,10,23,19,12,4,26,8,16,7,27,20,13,2,41,52,31,37,47,55,30,40,51,45,33,48,44,49,39,56,34,53,46,42,50,36,29,32];
    var IP = [58,50,42,34,26,18,10,2,60,52,44,36,28,20,12,4,62,54,46,38,30,22,14,6,64,56,48,40,32,24,16,8,57,49,41,33,25,17,9,1,59,51,43,35,27,19,11,3,61,53,45,37,29,21,13,5,63,55,47,39,31,23,15,7];
    var P = [16,7,20,21,29,12,28,17,1,15,23,26,5,18,31,10,2,8,24,14,32,27,3,9,19,13,30,6,22,11,4,25];
    var FP = new Uint8Array(64);
    IP.forEach(function (bit, i) { FP[bit - 1] = i + 1; });

    function bit64(high, low, bit) {
        return bit <= 32 ? (high >>> (32 - bit)) & 1 : (low >>> (64 - bit)) & 1;
    }

    function permute64(high, low, table) {
        var a = 0, b = 0;
        for (var i = 0; i < 32; i++) a = (a << 1) | bit64(high, low, table[i]);
        for (var j = 32; j < 64; j++) b = (b << 1) | bit64(high, low, table[j]);
        return [a, b];
    }

    function readWord(bytes, at) {
        return bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16) | (bytes[at + 3] << 24);
    }

    function writeWord(bytes, at, n) {
        for (var i = 0; i < 4; i++) bytes[at + i] = n >>> (i * 8);
    }

    function schedule(key) {
        var high = readWord(key, 0), low = readWord(key, 4), c = 0, d = 0;
        for (var i = 0; i < 28; i++) c = (c << 1) | bit64(high, low, PC1[i]);
        for (var j = 28; j < 56; j++) d = (d << 1) | bit64(high, low, PC1[j]);
        var keys = [], shifts = [1,1,2,2,2,2,2,2,1,2,2,2,2,2,2,1];
        shifts.forEach(function (shift) {
            c = ((c << shift) | (c >>> (28 - shift))) & 0xfffffff;
            d = ((d << shift) | (d >>> (28 - shift))) & 0xfffffff;
            var keyBits = new Uint8Array(8);
            for (var k = 0; k < 48; k++) {
                // QQ deliberately uses 59 - bit for D; standard DES uses another index.
                var selected = k < 24 ? ((c << 4) >>> (32 - PC2[k])) & 1 : ((d << 4) >>> (59 - PC2[k])) & 1;
                keyBits[Math.floor(k / 6)] = (keyBits[Math.floor(k / 6)] << 1) | selected;
            }
            keys.push(keyBits);
        });
        return keys;
    }

    var SP = S.map(function (box, index) {
        var table = new Int32Array(64);
        for (var n = 0; n < 64; n++) {
            var row = ((n & 32) >>> 4) | (n & 1);
            var value = box[row * 16 + ((n >>> 1) & 15)] << (28 - index * 4), result = 0;
            for (var p = 0; p < 32; p++) result = (result << 1) | ((value >>> (32 - P[p])) & 1);
            table[n] = result;
        }
        return table;
    });
    var SECRET = "!@#)(*$%123ZXC!@!@#)(NHL";
    var secretBytes = Uint8Array.from(SECRET, function (ch) { return ch.charCodeAt(0); });
    var KEY1 = schedule(secretBytes.subarray(0, 8));
    var KEY2 = schedule(secretBytes.subarray(8, 16));
    var KEY3 = schedule(secretBytes.subarray(16, 24));

    function feistel(r, key) {
        return SP[0][((((r & 1) << 5) | (r >>> 27)) ^ key[0]) & 63]
            ^ SP[1][((r >>> 23) ^ key[1]) & 63]
            ^ SP[2][((r >>> 19) ^ key[2]) & 63]
            ^ SP[3][((r >>> 15) ^ key[3]) & 63]
            ^ SP[4][((r >>> 11) ^ key[4]) & 63]
            ^ SP[5][((r >>> 7) ^ key[5]) & 63]
            ^ SP[6][((r >>> 3) ^ key[6]) & 63]
            ^ SP[7][((((r & 31) << 1) | (r >>> 31)) ^ key[7]) & 63];
    }

    function decryptHex(raw) {
        if (!raw.length || raw.length % 16 || raw.length > LIMIT * 2 || !/^[\da-f]+$/i.test(raw)) {
            throw new Error("无效 QRC 数据");
        }
        var bytes = new Uint8Array(raw.length / 2);
        for (var i = 0; i < bytes.length; i++) bytes[i] = parseInt(raw.slice(i * 2, i * 2 + 2), 16);
        var stages = [KEY3, KEY2, KEY1];
        for (var at = 0; at < bytes.length; at += 8) {
            var pair = permute64(readWord(bytes, at), readWord(bytes, at + 4), IP);
            var left = pair[0], right = pair[1];
            for (var stage = 0; stage < 3; stage++) {
                var keys = stages[stage];
                for (var round = 0; round < 16; round++) {
                    var next = left ^ feistel(right, keys[stage === 1 ? round : 15 - round]);
                    left = right;
                    right = next;
                }
                // Adjacent FP/IP permutations cancel between the three DES stages.
                var swap = left;
                left = right;
                right = swap;
            }
            pair = permute64(left, right, FP);
            writeWord(bytes, at, pair[0]);
            writeWord(bytes, at + 4, pair[1]);
        }
        return bytes;
    }

    function huffman(lengths) {
        var counts = new Uint16Array(16), next = new Uint16Array(16), max = 0, left = 1, code = 0;
        lengths.forEach(function (length) {
            if (length > 15) throw new Error("无效 QRC Huffman 码长");
            if (length) { counts[length]++; max = Math.max(max, length); }
        });
        if (!max) return null;
        for (var bits = 1; bits <= 15; bits++) {
            left = (left << 1) - counts[bits];
            if (left < 0) throw new Error("无效 QRC Huffman 表");
            code = (code + counts[bits - 1]) << 1;
            next[bits] = code;
        }
        var table = new Uint32Array(1 << max);
        lengths.forEach(function (length, symbol) {
            if (!length) return;
            var value = next[length]++, reversed = 0;
            for (var bit = 0; bit < length; bit++) { reversed = (reversed << 1) | (value & 1); value >>>= 1; }
            for (var n = reversed; n < table.length; n += 1 << length) table[n] = (symbol << 5) | length;
        });
        return { table: table, bits: max };
    }

    var fixedLengths = new Uint8Array(288);
    fixedLengths.fill(8, 0, 144); fixedLengths.fill(9, 144, 256);
    fixedLengths.fill(7, 256, 280); fixedLengths.fill(8, 280);
    var fixedLiteral = huffman(fixedLengths), fixedDistance = huffman(new Uint8Array(32).fill(5));
    var LENGTH_BASE = [3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258];
    var LENGTH_EXTRA = [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
    var DISTANCE_BASE = [1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577];
    var DISTANCE_EXTRA = [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
    var CODE_ORDER = [16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];

    function inflateZlib(bytes) {
        if (bytes.length < 6 || (bytes[0] & 15) !== 8 || (bytes[0] >>> 4) > 7
            || (((bytes[0] << 8) | bytes[1]) % 31) || (bytes[1] & 32)) {
            throw new Error("无效 QRC zlib 头");
        }
        var bitPosition = 16, output = new Uint8Array(Math.min(65536, LIMIT)), used = 0;
        function read(count) {
            if (bitPosition + count > bytes.length * 8) throw new Error("QRC 数据不完整");
            var at = bitPosition >>> 3, shift = bitPosition & 7;
            var value = (bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16)) >>> shift;
            bitPosition += count;
            return value & ((1 << count) - 1);
        }
        function symbol(tree) {
            if (!tree) throw new Error("无效 QRC Huffman 数据");
            var before = bitPosition, packed = tree.table[read(tree.bits)];
            if (!packed) throw new Error("无效 QRC Huffman 编码");
            bitPosition = before + (packed & 31);
            return packed >>> 5;
        }
        function reserve(count) {
            var needed = used + count;
            if (needed > LIMIT) throw new Error("QRC 解压结果过大");
            if (needed <= output.length) return;
            var larger = new Uint8Array(Math.min(LIMIT, Math.max(needed, output.length * 2)));
            larger.set(output);
            output = larger;
        }
        var finalBlock = 0;
        while (!finalBlock) {
            finalBlock = read(1);
            var type = read(2), literal, distance;
            if (type === 0) {
                bitPosition = (bitPosition + 7) & ~7;
                var length = read(16), complement = read(16);
                if ((length ^ complement) !== 65535) throw new Error("无效 QRC 存储块");
                reserve(length);
                if (bitPosition + length * 8 > bytes.length * 8) throw new Error("QRC 数据不完整");
                output.set(bytes.subarray(bitPosition >>> 3, (bitPosition >>> 3) + length), used);
                used += length;
                bitPosition += length * 8;
                continue;
            }
            if (type === 1) {
                literal = fixedLiteral;
                distance = fixedDistance;
            } else if (type === 2) {
                var literalCount = read(5) + 257, distanceCount = read(5) + 1, codeCount = read(4) + 4;
                if (literalCount > 286) throw new Error("无效 QRC 字面量表");
                var codeLengths = new Uint8Array(19);
                for (var c = 0; c < codeCount; c++) codeLengths[CODE_ORDER[c]] = read(3);
                var codeTree = huffman(codeLengths), lengths = [], total = literalCount + distanceCount;
                while (lengths.length < total) {
                    var entry = symbol(codeTree);
                    if (entry < 16) { lengths.push(entry); continue; }
                    if (entry === 16 && !lengths.length) throw new Error("无效 QRC 重复码长");
                    var repeat = entry === 16 ? read(2) + 3 : entry === 17 ? read(3) + 3 : read(7) + 11;
                    var previous = entry === 16 ? lengths[lengths.length - 1] : 0;
                    if (lengths.length + repeat > total) throw new Error("QRC 码长溢出");
                    while (repeat--) lengths.push(previous);
                }
                if (!lengths[256]) throw new Error("QRC 缺少块终止码");
                literal = huffman(lengths.slice(0, literalCount));
                distance = huffman(lengths.slice(literalCount));
            } else {
                throw new Error("无效 QRC deflate 块");
            }
            while (true) {
                var value = symbol(literal);
                if (value < 256) { reserve(1); output[used++] = value; continue; }
                if (value === 256) break;
                if (value > 285) throw new Error("无效 QRC 匹配长度");
                var li = value - 257, count = LENGTH_BASE[li] + read(LENGTH_EXTRA[li]);
                var di = symbol(distance);
                if (di > 29) throw new Error("无效 QRC 匹配距离");
                var offset = DISTANCE_BASE[di] + read(DISTANCE_EXTRA[di]);
                if (offset > used) throw new Error("无效 QRC 回溯距离");
                reserve(count);
                for (var n = 0; n < count; n++) { output[used] = output[used - offset]; used++; }
            }
        }
        var trailer = (bitPosition + 7) >>> 3;
        if (trailer + 4 > bytes.length) throw new Error("QRC 缺少校验和");
        var expected = ((bytes[trailer] << 24) | (bytes[trailer + 1] << 16) | (bytes[trailer + 2] << 8) | bytes[trailer + 3]) >>> 0;
        var a = 1, b = 0;
        for (var start = 0; start < used; start += 5552) {
            var end = Math.min(used, start + 5552);
            for (var i = start; i < end; i++) { a += output[i]; b += a; }
            a %= 65521; b %= 65521;
        }
        if ((((b << 16) | a) >>> 0) !== expected) throw new Error("QRC 校验失败");
        return output.subarray(0, used);
    }

    function unescapeXml(text) {
        var entities = { quot: '"', apos: "'", lt: "<", gt: ">", amp: "&" };
        return text.replace(/&(#x[\da-f]+|#\d+|quot|apos|lt|gt|amp);/gi, function (whole, name) {
            if (name[0] !== "#") return entities[name.toLowerCase()];
            var code = name[1].toLowerCase() === "x" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
            return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : whole;
        });
    }

    async function decode(raw) {
        if (typeof raw !== "string" || raw.length > LIMIT * 2) throw new Error("无效 QRC 数据");
        raw = raw.trim();
        if (raw.charAt(0) === "[") return raw;
        var bytes = inflateZlib(decryptHex(raw));
        var text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        if (/LyricContent\s*=/.test(text)) {
            var match = /LyricContent\s*=\s*"([\s\S]*)"\s*\/?>\s*<\/LyricInfo>/.exec(text) || /LyricContent\s*=\s*"([^"]*)"/.exec(text);
            if (!match) throw new Error("无效 QRC XML");
            text = match[1];
        }
        return unescapeXml(text);
    }

    root.AppleNowPlayingQQCodec = Object.freeze({ decode: decode, inflateZlib: inflateZlib });
})(typeof window !== "undefined" ? window : globalThis);

/*
Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS

   APPENDIX: How to apply the Apache License to your work.

      To apply the Apache License to your work, attach the following
      boilerplate notice, with the fields enclosed by brackets "[]"
      replaced with your own identifying information. (Don't include
      the brackets!)  The text should be enclosed in the appropriate
      comment syntax for the file format. We also recommend that a
      file or class name and description of purpose be included on the
      same "printed page" as the copyright notice for easier
      identification within third-party archives.

   Copyright 2023 XY Wang, WXRIW

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.

*/

/*
 * QQ lyric matching follows Simple Player's automatic-source rules.
 * OpenCC character folding: Apache-2.0, revision bcf847cf3fbd79c74779567f9a491ea8ab878183,
 * TSCharacters.txt / JPShinjitaiCharacters.txt (first candidate).
 * https://github.com/BYVoid/OpenCC/tree/bcf847cf3fbd79c74779567f9a491ea8ab878183/data/dictionary
 * Modified for this UI-only plugin. Full Apache-2.0 license is in the bundled qq-lyrics-codec.js.
 */
(function(root){
 'use strict';
 const traditional="㑮㑯㑳㑶㒓㓄㓨㔋㖮㗲㗿㘉㘓㘔㘚㛝㜄㜏㜐㜗㜢㜷㞞㟺㠏㠣㢗㢝㥮㦎㦛㦞㨻㩋㩜㩳㩵㪎㯤㰙㵗㵾㶆㷍㷿㸇㹽㺏㺜㻶㿖㿗㿧䀉䀹䁪䁻䂎䃮䅐䅳䆉䉑䉙䉬䉲䉶䊭䊷䊺䋃䋔䋙䋚䋦䋹䋻䋼䋿䌈䌋䌖䌝䌟䌥䌰䍤䍦䍽䎙䎱䓣䕤䕳䖅䗅䗿䙔䙡䙱䚩䛄䛳䜀䜖䝭䝻䝼䞈䞋䞓䟃䟆䟐䠆䠱䡐䡩䡵䢨䤤䥄䥇䥑䥕䥗䥩䥯䥱䦘䦛䦟䦯䦳䧢䪊䪏䪗䪘䪴䪾䫀䫂䫟䫴䫶䫻䫾䬓䬘䬝䬞䬧䭀䭃䭑䭔䭿䮄䮝䮞䮠䮫䮰䮳䮾䯀䯤䰾䱀䱁䱙䱧䱬䱰䱷䱸䱽䲁䲅䲖䲘䲰䳜䳢䳤䳧䳫䴉䴋䴬䴱䴴䴽䵳䵴䶕䶲丟並么乾亂亙亞仝佇佈佔併來侖侶侷俁係俓俔俠俥俬俱倀倆倈倉個們倖倫倲偉偑側偵偽傌傑傖傘備傢傭傯傳傴債傷傾僂僅僉像僑僕僞僤僥僨僱價儀儁儂億儈儉儎儐儔儕儘償儣優儭儲儷儸儺儻儼兇兌兒兗內兩冊冑冪凈凍凙凜凱別刪剄則剋剎剗剛剝剮剴創剷剾劃劄劇劉劊劌劍劏劑劚勁勑動務勛勝勞勢勣勩勱勳勵勸勻匭匯匱區協卹卻卽厙厠厤厭厲厴參叄叚叢吒吳吶呂咼員哩哯唄唓唸問啓啞啟啢喆喎喚喪喫喬單喲嗆嗇嗊嗎嗚嗩嗰嗶嗹嘆嘍嘓嘔嘖嘗嘜嘩嘪嘮嘯嘰嘳嘵嘸嘺嘽噁噅噓噚噝噞噠噥噦噯噲噴噸噹嚀嚇嚌嚐嚕嚙嚛嚥嚦嚧嚨嚮嚲嚳嚴嚶嚽囀囁囂囃囅囈囉囌囑囒囪圇國圍園圓圖團圞坏垻埡埨埬埰執堃堅堊堖堚堝堯報場塊塋塏塒塗塚塢塤塵塸塹塿墊墜墠墮墰墲墳墶墻墾壇壈壋壎壓壗壘壙壚壜壞壟壠壢壣壩壪壯壺壼壽夠夢夥夾奐奧奩奪奬奮奼妝姍姦娙娛婁婡婦婭媈媧媯媰媼媽嫋嫗嫵嫺嫻嫿嬀嬃嬇嬈嬋嬌嬙嬡嬣嬤嬦嬪嬰嬸嬻孃孄孆孇孋孌孎孫學孻孾孿宮寀寠寢實寧審寫寬寵寶將專尋對導尷屆屍屓屜屢層屨屩屬岡峯峴島峽崍崑崗崙崢崬嵐嵗嵼嵽嵾嶁嶄嶇嶈嶔嶗嶘嶠嶢嶧嶨嶮嶸嶹嶺嶼嶽巊巋巒巔巖巗巘巰巹帥師帳帶幀幃幓幗幘幝幟幣幩幫幬幷幹幾庫廁廂廄廈廎廕廚廝廞廟廠廡廢廣廧廩廬廳弒弔弳張強彃彄彆彈彌彎彔彙彠彥彫彲彷彿後徑從徠復徵徹徿恆恥悅悞悵悶悽惡惱惲惻愛愜愨愴愷愻愾慄態慍慘慚慟慣慤慪慫慮慳慶慺慼慾憂憊憐憑憒憖憚憢憤憫憮憲憶憸憹懀懇應懌懍懎懞懟懣懤懨懲懶懷懸懺懼懾戀戇戔戧戩戰戱戲戶扞拋拚挩挱挾捨捫捱捲掃掄掆掗掙掚掛採揀揚換揮揯損搖搗搧搵搶摋摐摑摜摟摯摳摶摺摻撈撊撏撐撓撝撟撣撥撧撫撲撳撻撾撿擁擄擇擊擋擓擔據擟擠擡擣擫擬擯擰擱擲擴擷擺擻擼擽擾攄攆攋攏攔攖攙攛攜攝攢攣攤攪攬敎敓敗敘敵數斂斃斅斆斕斬斷斸於旂旣昇時晉晛晝暈暉暐暘暢暫曄曆曇曉曊曏曖曠曥曨曬書會朥朧朮東枴柵柺査桱桿梔梖梘梜條梟梲棄棊棖棗棟棡棧棲棶椀椏椲楇楊楓楨業極榘榦榪榮榲榿構槍槓槤槧槨槫槮槳槶槼樁樂樅樑樓標樞樠樢樣樤樧樫樳樸樹樺樿橈橋機橢橫橯檁檉檔檜檟檢檣檭檮檯檳檵檸檻櫃櫅櫍櫓櫚櫛櫝櫞櫟櫠櫥櫧櫨櫪櫫櫬櫱櫳櫸櫻欄欅欇權欍欏欐欑欒欓欖欘欞欽歎歐歟歡歲歷歸歿殘殞殢殤殨殫殭殮殯殰殲殺殻殼毀毆毊毿氂氈氌氣氫氬氭氳氾汎汙決沈沒沖況泝洩洶浹浿涇涗涼淒淚淥淨淩淪淵淶淺淼渙減渢渦測渾湊湋湞湧湯溈準溝溡溫溮溳溼滄滅滌滎滙滬滯滲滷滸滻滾滿漁漊漍漚漢漣漬漲漵漸漿潁潑潔潕潙潚潛潣潤潯潰潷潿澀澂澅澆澇澐澗澠澤澦澩澫澬澮澱澾濁濃濄濆濕濘濚濛濜濟濤濧濫濰濱濺濼濾濿瀂瀃瀅瀆瀇瀉瀋瀏瀕瀘瀝瀟瀠瀦瀧瀨瀰瀲瀾灃灄灍灑灒灕灘灙灝灡灣灤灧灩災為烏烴無煇煉煒煙煢煥煩煬煱熂熅熉熌熒熓熗熚熡熰熱熲熾燀燁燈燉燒燖燙燜營燦燬燭燴燶燻燼燾爃爄爇爍爐爖爛爥爧爭爲爺爾牀牆牘牴牽犇犖犛犞犢犧狀狹狽猌猙猶猻獁獃獄獅獊獎獨獩獪獫獮獰獱獲獵獷獸獺獻獼玀玁珼現琱琺琿瑋瑒瑣瑤瑩瑪瑲瑻瑽璉璊璕璗璝璡璣璦璫璯環璵璸璼璽璾璿瓄瓅瓊瓏瓔瓕瓚瓛甌甕產産甦甯畝畢畫異畵當畼疇疊痙痠痮痾瘂瘋瘍瘓瘞瘡瘧瘮瘱瘲瘺瘻療癆癇癉癐癒癘癟癡癢癤癥癧癩癬癭癮癰癱癲發皁皚皟皰皸皺盃盜盞盡監盤盧盨盪眝眞眥眾睍睏睜睞瞘瞜瞞瞤瞭瞶瞼矇矉矑矓矚矯硃硜硤硨硯碕碙碩碭碸確碼碽磑磚磠磣磧磯磽磾礄礆礎礐礒礙礦礪礫礬礮礱祇祕祿禍禎禕禡禦禪禮禰禱禿秈稅稈稏稜稟種稱穀穇穌積穎穠穡穢穩穫穭窩窪窮窯窵窶窺竄竅竇竈竊竚竪竱競筆筍筦筧筴箇箋箏箚節範築篋篔篘篠篢篤篩篳篸簀簂簍簑簞簡簢簣簫簹簽簾籃籅籋籌籔籙籛籜籟籠籤籩籪籬籮籲粵糉糝糞糧糰糲糴糶糹糺糾紀紂紃約紅紆紇紈紉紋納紐紓純紕紖紗紘紙級紛紜紝紞紟紡紬紮細紱紲紳紵紹紺紼紿絀絁終絃組絅絆絍絎結絕絙絛絜絝絞絡絢絥給絧絨絪絰統絲絳絶絹絺綀綁綃綄綆綇綈綉綋綌綎綏綐綑經綖綜綝綞綟綠綡綢綣綧綪綫綬維綯綰綱網綳綴綵綸綹綺綻綽綾綿緄緇緊緋緍緑緒緓緔緗緘緙線緝緞緟締緡緣緤緦編緩緬緮緯緰緱緲練緶緷緸緹緻緼縈縉縊縋縍縎縐縑縕縗縛縝縞縟縣縧縫縬縭縮縯縰縱縲縳縴縵縶縷縸縹縺總績繂繃繅繆繈繏繐繒繓織繕繚繞繟繡繢繨繩繪繫繬繭繮繯繰繳繶繷繸繹繻繼繽繾繿纁纆纇纈纊續纍纏纓纔纕纖纗纘纚纜缽罃罈罌罎罰罵罷羅羆羈羋羣羥羨義羵羶習翫翬翹翽耑耬耮聖聞聯聰聲聳聵聶職聹聻聽聾肅脅脈脛脣脥脩脫脹腎腖腡腦腪腫腳腸膃膕膚膞膠膢膩膹膽膾膿臉臍臏臗臘臚臟臠臢臥臨臺與興舉舊舖舘艙艣艤艦艫艱艷芻苧茲荊莊莖莢莧菉菕華菴菸萇萊萬萴萵葉葒葝葤葦葯葷蒍蒐蒓蒔蒕蒞蒭蒼蓀蓆蓋蓧蓮蓯蓴蓽蔄蔔蔘蔞蔣蔥蔦蔭蔯蔿蕁蕆蕎蕒蕓蕕蕘蕝蕢蕩蕪蕭蕳蕷蕽薀薆薈薊薌薑薔薘薟薦薩薳薴薵薹薺藉藍藎藝藥藪藭藴藶藷藹藺蘀蘄蘆蘇蘊蘋蘚蘞蘟蘢蘭蘺蘿虆虉處虛虜號虧虯蛺蛻蜆蝀蝕蝟蝦蝨蝸螄螞螢螮螻螿蟂蟄蟈蟎蟘蟜蟣蟬蟯蟲蟳蟶蟻蠀蠁蠅蠆蠍蠐蠑蠔蠙蠟蠣蠦蠨蠱蠶蠻蠾衆衊術衕衚衛衝衹袞袷裊裏補裝裡製複褌褘褲褳褸褻襀襇襉襏襓襖襗襘襝襠襤襪襬襯襰襲襴襵覆覈見覎規覓視覘覛覡覥覦親覬覯覲覷覹覺覼覽覿觀觴觶觸訁訂訃計訊訌討訏訐訑訒訓訕訖託記訛訜訝訞訟訢訣訥訨訩訪設許訴訶診註証詀詁詆詊詎詐詑詒詓詔評詖詗詘詛詝詞詠詡詢詣試詩詪詫詬詭詮詰話該詳詵詷詼詿誂誄誅誆誇誋誌認誑誒誕誘誚語誠誡誣誤誥誦誨說誫説誰課誳誴誶誷誹誺誼誾調諂諄談諉請諍諏諑諒諓論諗諛諜諝諞諟諡諢諣諤諥諦諧諫諭諮諯諰諱諲諳諴諶諷諸諺諼諾謀謁謂謄謅謆謉謊謎謏謐謔謖謗謙謚講謝謠謡謨謫謬謭謯謱謳謸謹謾譁譂譅譆證譊譎譏譑譓譖識譙譚譜譞譟譨譫譭譯議譴護譸譽譾讀讅變讋讌讎讒讓讕讖讚讜讞谿豈豎豐豔豬豵豶貍貓貗貙貝貞貟負財貢貧貨販貪貫責貯貰貲貳貴貶買貸貺費貼貽貿賀賁賂賃賄賅資賈賊賑賒賓賕賙賚賜賝賞賟賠賡賢賣賤賦賧質賫賬賭賰賴賵賺賻購賽賾贃贄贅贇贈贉贊贋贍贏贐贑贓贔贖贗贚贛贜赬趕趙趨趲跡踐踰踴蹌蹔蹕蹟蹠蹣蹤蹳蹺蹻躂躉躊躋躍躎躑躒躓躕躘躚躝躡躥躦躪軀軉車軋軌軍軏軑軒軔軕軗軛軜軝軟軤軨軫軬軲軷軸軹軺軻軼軾軿較輄輅輇輈載輊輋輒輓輔輕輖輗輛輜輝輞輟輢輥輦輨輩輪輬輮輯輳輶輷輸輻輼輾輿轀轂轄轅轆轇轉轊轍轎轐轔轗轟轠轡轢轣轤辦辭辮辯農迴迺逕這連週進遊運過達違遙遜遞遠遡適遱遲遶遷選遺遼邁還邇邊邏邐邨郟郵鄆鄉鄒鄔鄖鄟鄧鄩鄭鄰鄲鄳鄴鄶鄺酇酈醃醖醜醞醟醣醫醬醱醲醶釀釁釃釅釋釐釒釓釔釕釗釘釙釚針釟釣釤釦釧釨釩釲釳釴釵釷釹釺釾釿鈀鈁鈃鈄鈅鈆鈇鈈鈉鈋鈍鈎鈐鈑鈒鈔鈕鈖鈗鈛鈞鈠鈡鈣鈥鈦鈧鈮鈯鈰鈲鈳鈴鈷鈸鈹鈺鈽鈾鈿鉀鉁鉅鉆鉈鉉鉊鉋鉍鉑鉔鉕鉗鉚鉛鉝鉞鉠鉢鉤鉥鉦鉧鉬鉭鉮鉳鉶鉷鉸鉺鉻鉽鉾鉿銀銁銂銃銅銈銊銍銏銑銓銖銘銚銛銜銠銣銥銦銨銩銪銫銬銱銳銶銷銹銻銼鋁鋂鋃鋅鋇鋉鋌鋏鋐鋒鋗鋙鋝鋟鋠鋣鋤鋥鋦鋨鋩鋪鋭鋮鋯鋰鋱鋶鋸鋹鋼錀錁錂錄錆錇錈錏錐錒錕錘錙錚錛錜錝錞錟錠錡錢錤錥錦錨錩錫錮錯録錳錶錸錼錽鍀鍁鍃鍄鍅鍆鍇鍈鍉鍊鍋鍍鍒鍔鍘鍚鍛鍠鍤鍥鍩鍬鍭鍮鍰鍵鍶鍺鍼鍾鎂鎄鎇鎈鎊鎌鎍鎓鎔鎖鎘鎙鎚鎛鎝鎞鎡鎢鎣鎦鎧鎩鎪鎬鎭鎮鎯鎰鎲鎳鎵鎶鎷鎸鎿鏃鏆鏇鏈鏉鏌鏍鏏鏐鏑鏗鏘鏚鏜鏝鏞鏟鏡鏢鏤鏥鏦鏨鏰鏵鏷鏹鏺鏻鏽鏾鐃鐄鐇鐈鐋鐍鐎鐏鐐鐒鐓鐔鐘鐙鐝鐠鐥鐦鐧鐨鐩鐪鐫鐮鐯鐲鐳鐵鐶鐸鐺鐼鐽鐿鑀鑄鑉鑊鑌鑑鑒鑔鑕鑞鑠鑣鑥鑪鑭鑰鑱鑲鑴鑷鑹鑼鑽鑾鑿钁钂長門閂閃閆閈閉開閌閍閎閏閐閑閒間閔閗閘閝閞閡閣閤閥閨閩閫閬閭閱閲閵閶閹閻閼閽閾閿闃闆闇闈闉闊闋闌闍闐闑闒闓闔闕闖關闞闠闡闢闤闥阪陘陝陞陣陰陳陸陽隉隊階隑隕際隤隨險隮隯隱隴隸隻雋雖雙雛雜雞離難雲電霑霢霣霧霼霽靂靄靆靈靉靚靜靝靦靧靨鞏鞝鞦鞽鞾韁韃韆韉韋韌韍韓韙韚韛韜韝韞韠韻響頁頂頃項順頇須頊頌頍頎頏預頑頒頓頔頗領頜頠頡頤頦頫頭頮頰頲頴頵頷頸頹頻頽顂顃顅顆題額顎顏顒顓顔顗願顙顛類顢顣顥顧顫顬顯顰顱顳顴風颭颮颯颰颱颳颶颷颸颺颻颼颾飀飄飆飈飋飛飠飢飣飥飦飩飪飫飭飯飱飲飴飵飶飼飽飾飿餃餄餅餈餉養餌餎餏餑餒餓餔餕餖餗餘餚餛餜餞餡餦餧館餪餫餬餭餱餳餵餶餷餸餺餼餾餿饁饃饅饈饉饊饋饌饑饒饗饘饜饞饟饠饢馬馭馮馯馱馳馴馹馼駁駃駉駊駎駐駑駒駓駔駕駘駙駚駛駝駞駟駡駢駤駧駩駪駫駭駰駱駶駸駻駼駿騁騂騃騄騅騉騊騌騍騎騏騑騔騖騙騚騜騝騞騟騠騤騧騪騫騭騮騰騱騴騵騶騷騸騻騼騾驀驁驂驃驄驅驊驋驌驍驎驏驓驕驗驙驚驛驟驢驤驥驦驨驪驫骯髏髒體髕髖髮鬆鬍鬖鬚鬠鬢鬥鬧鬨鬩鬮鬱鬹魎魘魚魛魟魢魥魦魨魯魴魵魷魺魽鮀鮁鮃鮄鮅鮆鮈鮊鮋鮍鮎鮐鮑鮒鮓鮚鮜鮝鮞鮟鮠鮡鮣鮤鮦鮪鮫鮭鮮鮯鮰鮳鮵鮶鮸鮺鮿鯀鯁鯄鯆鯇鯉鯊鯒鯔鯕鯖鯗鯛鯝鯞鯡鯢鯤鯧鯨鯪鯫鯬鯰鯱鯴鯶鯷鯻鯽鯾鯿鰁鰂鰃鰆鰈鰉鰊鰋鰌鰍鰏鰐鰑鰒鰓鰕鰛鰜鰟鰠鰣鰤鰥鰦鰧鰨鰩鰫鰭鰮鰱鰲鰳鰵鰶鰷鰹鰺鰻鰼鰽鰾鱀鱂鱄鱅鱆鱇鱈鱉鱊鱒鱔鱖鱗鱘鱚鱝鱟鱠鱢鱣鱤鱧鱨鱭鱮鱯鱲鱷鱸鱺鳥鳧鳩鳬鳲鳳鳴鳶鳷鳼鳽鳾鴀鴃鴅鴆鴇鴉鴐鴒鴔鴕鴗鴛鴜鴝鴞鴟鴣鴥鴦鴨鴮鴯鴰鴲鴳鴴鴷鴻鴽鴿鵁鵂鵃鵊鵏鵐鵑鵒鵓鵚鵜鵝鵟鵠鵡鵧鵩鵪鵫鵬鵮鵯鵰鵲鵷鵾鶄鶇鶉鶊鶌鶒鶓鶖鶗鶘鶚鶠鶡鶥鶦鶩鶪鶬鶭鶯鶰鶱鶲鶴鶹鶺鶻鶼鶿鷀鷁鷂鷄鷅鷉鷊鷐鷓鷔鷖鷗鷙鷚鷟鷣鷤鷥鷦鷨鷩鷫鷭鷯鷲鷳鷴鷷鷸鷹鷺鷽鷿鸂鸇鸊鸋鸌鸏鸑鸕鸗鸘鸚鸛鸝鸞鹵鹹鹺鹼鹽麗麥麨麩麪麫麬麯麲麳麴麵麷麼麽黃黌點黨黲黴黶黷黽黿鼂鼉鼕鼴齊齋齎齏齒齔齕齗齘齙齜齟齠齡齣齦齧齩齪齬齭齮齯齰齲齴齶齷齼齾龍龎龐龑龓龔龕龜龢龭龯鿁鿓𠁞𠌥𠏢𠐊𠗣𠞆𠠎𠬙𠼤𠽃𠿕𡂡𡃄𡃕𡃤𡄔𡄣𡅏𡅯𡑍𡑭𡓁𡓾𡔖𡞵𡟫𡠹𡢃𡮉𡮣𡳳𡸗𡹬𡻕𡽗𡾱𡿖𢍰𢠼𢣐𢣚𢣭𢤩𢤱𢤿𢯷𢶒𢶫𢷮𢹿𢺳𣈶𣋋𣍐𣙎𣜬𣝕𣞻𣠩𣠲𣯩𣯴𣯶𣽏𣾷𣿉𤁣𤄷𤅶𤑳𤑹𤒎𤒻𤓌𤓎𤓩𤘀𤛮𤛱𤜆𤠮𤢟𤢻𤩂𤪺𤫩𤬅𤳷𤳸𤷃𤸫𤺔𥊝𥌃𥏝𥕥𥖅𥖲𥗇𥗽𥜐𥜰𥞵𥢢𥢶𥢷𥨐𥪂𥯤𥴨𥴼𥵃𥵊𥶽𥸠𥻦𥼽𥽖𥾯𥿊𦀖𦂅𦃄𦃩𦅇𦅈𦆲𦒀𦔖𦘧𦟼𦠅𦡝𦢈𦣎𦧺𦪙𦪽𦱌𦾟𧎈𧒯𧔥𧕟𧜗𧜵𧝞𧞫𧟀𧡴𧢄𧦝𧦧𧩕𧩙𧩼𧫝𧬤𧭈𧭹𧳟𧵳𧶔𧶧𧷎𧸘𧹈𧽯𨂐𨄣𨅍𨆪𨇁𨇞𨇤𨇰𨇽𨈊𨈌𨊰𨊸𨊻𨋢𨌈𨍰𨎌𨎮𨏠𨏥𨞺𨟊𨢿𨣈𨣞𨣧𨤻𨥛𨥟𨦫𨧀𨧜𨧰𨧱𨨏𨨛𨨢𨩰𨪕𨫒𨬖𨭆𨭎𨭖𨭸𨮂𨮳𨯅𨯟𨰃𨰋𨰥𨰲𨲳𨳑𨳕𨴗𨴹𨵩𨵸𨶀𨶏𨶮𨶲𨷲𨼳𨽏𩀨𩅙𩎖𩎢𩏂𩏠𩏪𩏷𩑔𩒎𩓣𩓥𩔑𩔳𩖰𩗀𩗓𩗴𩘀𩘝𩘹𩘺𩙈𩚛𩚥𩚩𩚵𩛆𩛌𩛡𩛩𩜇𩜦𩜵𩝔𩝽𩞄𩞦𩞯𩟐𩟗𩠴𩡣𩡺𩢡𩢴𩢸𩢾𩣏𩣑𩣫𩣵𩣺𩤊𩤙𩤲𩤸𩥄𩥇𩥉𩥑𩦠𩧆𩭙𩯁𩯳𩰀𩰹𩳤𩴵𩵦𩵩𩵹𩶁𩶘𩶰𩶱𩷰𩸃𩸄𩸡𩸦𩻗𩻬𩻮𩼶𩽇𩿅𩿤𩿪𪀖𪀦𪀾𪁈𪁖𪂆𪃍𪃏𪃒𪃧𪄆𪄕𪅂𪆷𪇳𪈼𪉸𪋿𪌭𪍠𪓰𪔵𪘀𪘯𪙏𪟖𪷓𫒡𫜦𰻞";
const simplified="㑮㑔㑇㐹㒓㓄刾㔋㖮𠵾㗿㘉㘓㘔㘎㛝㚯㛣㜐㜗𡞱㜷㞞㟺㟆𫵷㢗㢝㤘㦎㦛㦞㨻㩋㨫㧐擜㪎㯤㰙㵗㵾㶆㷍㷿㸇㹽𤠋㺜㻶㿖㿗㿧䀉䀹𥇢䀥䂎鿎䅐䅳䆉䉑䉙䉬䉲䉶䊭䌶䊺䋃䋔䌺䌻䋦䌿䌾䋼䋿䌈䌋䌖䌝䌟䌥䌰䍤䍠䍽䎙䎬𬜯䕤䕳䖅䗅䗿䙔䙌䙱䚩䛄䛳䜧䜖䝭䝻䞍䞈䞋䞓䟃䟆䟐䠆䠱䡐䡩𫟦䢨䤤䥄䦂鿏𬭯䥗䥩䥯䥾䦘䦶䦷䦯䦳𨸟䪊䪏䪗䪘䪴䪾䫀䫂䫟䫴䫶䫻䫾䬓䬘䬝䬞䬧䭀䭃䭑䭔䭿𫠊䮝䮞䮠䮫䮰䮳䮾䯅䯤鲃䱀䱁䱙䱧䱬䱰䲣䱸䲝鳚䲅䲖鳤䲰䳜䳢䳤䳧䳫鹮䴋䴬䴱䴴䴽䵳䵴䶕䶲丢并么干乱亘亚仝伫布占并来仑侣局俣系俓伣侠伡私俱伥俩俫仓个们幸伦㑈伟㐽侧侦伪㐷杰伧伞备家佣偬传伛债伤倾偻仅佥像侨仆伪𫢸侥偾雇价仪俊侬亿侩俭傤傧俦侪尽偿儣优儭储俪㑩傩傥俨凶兑儿兖内两册胄幂净冻凙凛凯别删刭则克刹刬刚剥剐剀创铲剾划札剧刘刽刿剑㓥剂㔉劲勑动务勋胜劳势𪟝勚劢勋励劝匀匦汇匮区协恤却即厍厕历厌厉厣参叁叚丛咤吴呐吕呙员哩哯呗唓念问启哑启唡喆㖞唤丧吃乔单哟呛啬唝吗呜唢𠮶哔嗹叹喽啯呕啧尝唛哗嘪唠啸叽嘳哓呒嘺啴恶噅嘘㖊咝噞哒哝哕嗳哙喷吨当咛吓哜尝噜啮嚛咽呖𠰷咙向亸喾严嘤嚽啭嗫嚣囃冁呓啰苏嘱囒囱囵国围园圆图团圞坏坝垭𫭢埬采执堃坚垩垴堚埚尧报场块茔垲埘涂冢坞埙尘𫭟堑𪣻垫坠𫮃堕坛墲坟垯墙垦坛壈垱埙压𡋤垒圹垆坛坏垄垅坜壣坝塆壮壶壸寿够梦伙夹奂奥奁夺奖奋姹妆姗奸𫰛娱娄婡妇娅媈娲妫㛀媪妈袅妪妩娴娴婳妫媭嬇娆婵娇嫱嫒嬣嬷嬦嫔婴婶嬻娘孄孆孇㛤娈孎孙学𡥧孾孪宫采寠寝实宁审写宽宠宝将专寻对导尴届尸屃屉屡层屦屩属冈峰岘岛峡崃昆岗仑峥岽岚岁嵼𫶇㟥嵝崭岖嶈嵚崂嶘峤峣峄峃崄嵘嶹岭屿岳巊岿峦巅岩巗𪩘巯卺帅师帐带帧帏㡎帼帻幝帜币幩帮帱并干几库厕厢厩厦庼荫厨厮𫷷庙厂庑废广廧廪庐厅弑吊弪张强彃𫸩别弹弥弯录汇彟彦雕彨彷佛后径从徕复征彻徿恒耻悦悮怅闷凄恶恼恽恻爱惬悫怆恺愻忾栗态愠惨惭恸惯悫怄怂虑悭庆㥪戚欲忧惫怜凭愦慭惮憢愤悯怃宪忆憸憹懀恳应怿懔懎蒙怼懑㤽恹惩懒怀悬忏惧慑恋戆戋戗戬战戯戏户捍抛拼捝挲挟舍扪挨卷扫抡㧏挜挣掚挂采拣扬换挥搄损摇捣扇揾抢摋摐掴掼搂挚抠抟折掺捞撊挦撑挠㧑挢掸拨撧抚扑揿挞挝捡拥掳择击挡㧟担据擟挤抬捣擫拟摈拧搁掷扩撷摆擞撸㧰扰摅撵攋拢拦撄搀撺携摄攒挛摊搅揽教敚败叙敌数敛毙斅敩斓斩断斸于旗既升时晋𬀪昼晕晖𬀩旸畅暂晔历昙晓曊向暧旷𣆐昽晒书会𦛨胧术东拐栅拐查𣐕杆栀梖枧𬂩条枭棁弃棋枨枣栋㭎栈栖梾椀桠㭏楇杨枫桢业极矩干杩荣榅桤构枪杠梿椠椁槫椮桨椢椝桩乐枞梁楼标枢樠㭤样樤榝㭴桪朴树桦椫桡桥机椭横𣓿檩柽档桧槚检樯檭梼台槟檵柠槛柜櫅𬃊橹榈栉椟橼栎櫠橱槠栌枥橥榇蘖栊榉樱栏榉欇权欍椤欐欑栾𣗋榄欘棂钦叹欧欤欢岁历归殁残殒殢殇㱮殚僵殓殡㱩歼杀壳壳毁殴毊毵牦毡氇气氢氩氭氲泛泛污决沈没冲况溯泄汹浃𬇙泾涚凉凄泪渌净凌沦渊涞浅淼涣减沨涡测浑凑𣲗浈涌汤沩准沟溡温浉涢湿沧灭涤荥汇沪滞渗卤浒浐滚满渔溇𬇹沤汉涟渍涨溆渐浆颍泼洁𣲘沩㴋潜潣润浔溃滗涠涩澂澅浇涝沄涧渑泽滪泶𬇕澬浍淀㳠浊浓㳡𣸣湿泞溁蒙浕济涛㳔滥潍滨溅泺滤濿澛瀃滢渎㲿泻沈浏濒泸沥潇潆潴泷濑弥潋澜沣滠灍洒𪷽漓滩𣺼灏㳕湾滦滟滟灾为乌烃无煇炼炜烟茕焕烦炀㶽熂煴熉熌荧熓炝熚熡𬉼热颎炽𬊤烨灯炖烧𬊈烫焖营灿毁烛烩㶶熏烬焘爃爄爇烁炉爖烂爥爧争为爷尔床墙牍抵牵犇荦牦犞犊牺状狭狈猌狰犹狲犸呆狱狮獊奖独獩狯猃狝狞㺍获猎犷兽獭献猕猡玁珼现雕珐珲玮玚琐瑶莹玛玱瑻瑽琏𫞩𬍤𬍡璝琎玑瑷珰㻅环玙瑸璼玺璾璇瓄𬍛琼珑璎瓕瓒𤩽瓯瓮产产甦甯亩毕画异画当畼畴叠痉酸痮疴痖疯疡痪瘗疮疟瘆瘱疭瘘瘘疗痨痫瘅癐愈疠瘪痴痒疖症疬癞癣瘿瘾痈瘫癫发皂皑皟疱皲皱杯盗盏尽监盘卢盨荡眝真眦众𪾢困睁睐眍䁖瞒瞤瞭瞆睑蒙矉矑眬瞩矫朱硁硖砗砚埼碙硕砀砜确码䂵硙砖硵碜碛矶硗䃅硚礆础𬒈礒碍矿砺砾矾礮砻祇秘禄祸祯祎祃御禅礼祢祷秃籼税秆䅉棱禀种称谷䅟稣积颖秾穑秽稳获穞窝洼穷窑窎窭窥窜窍窦灶窃竚竖竱竞笔笋筦笕䇲个笺筝札节范筑箧筼篘筿𬕂笃筛筚𥮾箦簂篓蓑箪简簢篑箫筜签帘篮𥫣籋筹䉤箓篯箨籁笼签笾簖篱箩吁粤粽糁粪粮团粝籴粜纟糺纠纪纣𬘓约红纡纥纨纫纹纳纽纾纯纰纼纱纮纸级纷纭纴𬘘紟纺䌷扎细绂绁绅纻绍绀绋绐绌絁终弦组䌹绊絍绗结绝絙绦絜绔绞络绚絥给絧绒𬘡绖统丝绛绝绢𫄨綀绑绡𬘫绠綇绨绣綋绤𬘩绥䌼捆经𫄧综𬘭缍綟绿𫟅绸绻𬘯𬘬线绶维绹绾纲网绷缀彩纶绺绮绽绰绫绵绲缁紧绯緍绿绪绬绱缃缄缂线缉缎緟缔缗缘緤缌编缓缅緮纬緰缑缈练缏緷緸缇致缊萦缙缢缒縍縎绉缣缊缞缚缜缟缛县绦缝縬缡缩𬙂縰纵缧䌸纤缦絷缕縸缥縺总绩繂绷缫缪繈繏繐缯繓织缮缭绕繟绣缋繨绳绘系繬茧缰缳缲缴𫄷繷䍁绎𦈡继缤缱䍀𫄸𬙊颣缬纩续累缠缨才𬙋纤纗缵纚缆钵䓨坛罂坛罚骂罢罗罴羁芈群羟羡义羵膻习玩翚翘翙耑耧耢圣闻联聪声耸聩聂职聍聻听聋肃胁脉胫唇脥修脱胀肾胨脶脑腪肿脚肠腽腘肤䏝胶𦝼腻膹胆脍脓脸脐膑臗腊胪脏脔臜卧临台与兴举旧铺馆舱艣舣舰舻艰艳刍苎兹荆庄茎荚苋菉菕华庵烟苌莱万荝莴叶荭葝荮苇药荤𫇭搜莼莳蒀莅蒭苍荪席盖蓧莲苁莼荜𬜬卜参蒌蒋葱茑荫𫈟𫇭荨蒇荞荬芸莸荛蕝蒉荡芜萧蕳蓣蕽蕰薆荟蓟芗姜蔷荙莶荐萨薳苧䓓苔荠藉蓝荩艺药薮䓖蕴苈藷蔼蔺萚蕲芦苏蕴苹藓蔹𦻕茏兰蓠萝蔂𬟁处虚虏号亏虬蛱蜕蚬𬟽蚀猬虾虱蜗蛳蚂萤䗖蝼螀蟂蛰蝈螨蟘蟜虮蝉蛲虫𫊻蛏蚁蠀蚃蝇虿蝎蛴蝾蚝蠙蜡蛎蠦蟏蛊蚕蛮蠾众蔑术同胡卫冲衹衮夹袅里补装里制复裈袆裤裢褛亵𫌀裥裥袯襓袄襗襘裣裆褴袜摆衬襰袭襕襵覆核见觃规觅视觇覛觋觍觎亲觊觏觐觑覹觉覼览觌观觞觯触讠订讣计讯讧讨𬣙讦訑讱训讪讫托记讹訜讶訞讼䜣诀讷訨讻访设许诉诃诊注证𧮪诂诋詊讵诈詑诒詓诏评诐诇诎诅𬣞词咏诩询诣试诗𬣳诧诟诡诠诘话该详诜𫍣诙诖誂诔诛诓夸誋志认诳诶诞诱诮语诚诫诬误诰诵诲说誫说谁课誳誴谇誷诽誺谊訚调谄谆谈诿请诤诹诼谅𬣡论谂谀谍谞谝𬤊谥诨諣谔諥谛谐谏谕咨諯諰讳𬤇谙𫍯谌讽诸谚谖诺谋谒谓誊诌謆謉谎谜𫍲谧谑谡谤谦谥讲谢谣谣谟谪谬谫謯謱讴謸谨谩哗譂譅譆证譊谲讥譑𬤝谮识谯谭谱𫍽噪譨谵毁译议谴护诪誉谫读谉变詟䜩雠谗让谰谶赞谠谳溪岂竖丰艳猪豵豮狸猫貗䝙贝贞贠负财贡贫货贩贪贯责贮贳赀贰贵贬买贷贶费贴贻贸贺贲赂赁贿赅资贾贼赈赊宾赇赒赉赐賝赏賟赔赓贤卖贱赋赕质赍账赌䞐赖赗赚赙购赛赜贃贽赘赟赠贉赞赝赡赢赆贑赃赑赎赝贚赣赃赪赶赵趋趱迹践逾踊跄蹔跸迹跖蹒踪蹳跷蹻跶趸踌跻跃䟢踯跞踬蹰躘跹躝蹑蹿躜躏躯軉车轧轨军𫐄轪轩轫軕軗轭軜𬨂软轷軨轸軬轱軷轴轵轺轲轶轼軿较𨐈辂辁辀载轾𪨶辄挽辅轻輖𫐐辆辎辉辋辍輢辊辇輨辈轮辌𫐓辑辏𬨎輷输辐辒辗舆辒毂辖辕辘轇转轊辙轿轐辚轗轰轠辔轹轣轳办辞辫辩农回迺径这连周进游运过达违遥逊递远溯适遱迟绕迁选遗辽迈还迩边逻逦邨郏邮郓乡邹邬郧鄟邓𬩽郑邻郸𫑡邺郐邝酂郦腌酝丑酝蒏糖医酱酦𬪩醶酿衅酾酽释厘钅钆钇钌钊钉钋釚针釟钓钐扣钏釨钒釲釳𬬩钗钍钕钎䥺𬬱钯钫钘钭钥鈆𫓧钚钠鈋钝钩钤钣钑钞钮鈖鈗鈛钧鈠钟钙钬钛钪铌鈯铈鈲钶铃钴钹铍钰钸铀钿钾鉁巨钻铊铉𬬿铇铋铂鉔钷钳铆铅𫟷钺鉠钵钩𬬸钲𬭁钼钽𬬹锫铏𫟹铰铒铬鉽鉾铪银銁銂铳铜𫓯銊铚銏铣铨铢铭铫铦衔铑铷铱铟铵铥铕铯铐铞锐𨱇销锈锑锉铝鋂锒锌钡鋉铤铗𬭎锋𫓶铻锊锓鋠铘锄锃锔锇铓铺锐铖锆锂铽锍锯𬬮钢𬬭锞錂录锖锫锩铔锥锕锟锤锱铮锛錜錝𬭚锬锭锜钱𫓹錥锦锚锠锡锢错录锰表铼镎錽锝锨锪鍄钫钔锴锳鍉炼锅镀鍒锷铡钖锻锽锸锲锘锹𬭤鍮锾键锶锗针钟镁锿镅鎈镑镰鎍𬭩镕锁镉鎙锤镈𨱏鎞镃钨蓥镏铠铩锼镐镇镇鎯镒镋镍镓鿔鎷镌镎镞鏆旋链鏉镆镙𬭬镠镝铿锵鏚镗镘镛铲镜镖镂鏥鏦錾镚铧镤镪䥽𬭸锈鏾铙𨱑𫔍鐈铴𫔎鐎𨱔镣铹镦镡钟镫镢镨䦅锎锏镄𬭼鐪镌镰䦃镯镭铁镮铎铛鐼𫟼镱鑀铸鑉镬镔鉴鉴镲锧镴铄镳镥𬬻镧钥镵镶鑴镊镩锣钻銮凿镢镋长门闩闪闫闬闭开闶閍闳闰閐闲闲间闵閗闸閝閞阂阁合阀闺闽阃阆闾阅阅閵阊阉阎阏阍阈阌阒板暗闱𬮱阔阕阑阇阗𫔶阘闿阖阙闯关阚阓阐辟阛闼阪陉陕升阵阴陈陆阳陧队阶𬮿陨际𬯎随险𬯀陦隐陇隶只隽虽双雏杂鸡离难云电沾霡霣雾霼霁雳霭叇灵叆靓静靔腼靧靥巩绱秋鞒鞾缰鞑千鞯韦韧韨韩韪韚韛韬鞲韫韠韵响页顶顷项顺顸须顼颂𫠆颀颃预顽颁顿𬱖颇领颌𬱟颉颐颏𫖯头颒颊颋颕𫖳颔颈颓频颓顂顃顅颗题额颚颜颙颛颜𫖮愿颡颠类颟顣颢顾颤颥显颦颅颞颧风飐飑飒颰台刮飓颷飔飏飖飕颾飗飘飙飚飋飞饣饥饤饦飦饨饪饫饬饭飧饮饴飵飶饲饱饰饳饺饸饼糍饷养饵饹饻饽馁饿餔馂饾𫗧余肴馄馃饯馅餦餧馆餪餫糊餭糇饧喂馉馇𩠌馎饩馏馊馌馍馒馐馑馓馈馔饥饶飨𫗴餍馋饟饠馕马驭冯馯驮驰驯驲𫘜驳𫘝𬳶駊駎驻驽驹𬳵驵驾骀驸駚驶驼駞驷骂骈駤駧駩𬳽駫骇骃骆駶骎駻𬳿骏骋骍騃𫘧骓騉𫘦骔骒骑骐𬴂騔骛骗騚騜騝𬴃騟𫘨骙䯄騪骞骘骝腾𫘬騴𫘪驺骚骟騻騼骡蓦骜骖骠骢驱骅驋骕骁𬴊骣驓骄验驙惊驿骤驴骧骥骦驨骊骉肮髅脏体髌髋发松胡鬖须鬠鬓斗闹哄阋阄郁鬶魉魇鱼鱽𫚉鱾魥魦鲀鲁鲂魵鱿鲄魽𬶍鲅鲆鮄鮅𫚖𬶋鲌鲉鲏鲇鲐鲍鲋鲊鲒鲘鲞鲕𩽾𬶏𬶐䲟鮤鲖鲔鲛鲑鲜鮯鮰鲓鮵鲪𩾃鲝鮿鲧鲠鯄鯆鲩鲤鲨鲬鲻鲯鲭鲞鲷鲴鯞鲱鲵鲲鲳鲸鲮鲰鯬鲶鯱鲺鯶鳀𬶟鲫鯾鳊鳈鲗鳂䲠鲽鳇𬶠鰋䲡鳅鲾鳄鰑鳆鳃鰕鳁鳒鳑鳋鲥𫚕鳏鰦䲢鳎鳐鰫鳍鳁鲢鳌鳓鳘𬶭鲦鲣鲹鳗鳛鰽鳔𬶨鳉鱄鳙鱆𩾌鳕鳖鱊鳟鳝鳜鳞鲟𬶮鲼鲎鲙鱢鳣鳡鳢鲿鲚鱮鳠𫚭鳄鲈鲡鸟凫鸠凫鸤凤鸣鸢鳷鳼鳽䴓鴀鴃鴅鸩鸨鸦鴐鸰鴔鸵鴗鸳鴜鸲鸮鸱鸪鴥鸯鸭鴮鸸鸹鴲鴳鸻䴕鸿鴽鸽䴔鸺鸼鵊𬷕鹀鹃鹆鹁鵚鹈鹅𫛭鹄鹉鵧鵩鹌鵫鹏鹐鹎雕鹊鹓鹍䴖鸫鹑鹒鶌鶒鹋鹙鶗鹕鹗𬸘鹖鹛鶦鹜䴗鸧鶭莺鶰𬸣鹟鹤鹠鹡鹘鹣鹚鹚鹢鹞鸡鷅䴘鹝鷐鹧鷔鹥鸥鸷鹨𬸦鷣鷤鸶鹪鷨鷩鹔𬸪鹩鹫鹇鹇鷷鹬鹰鹭鸴鷿㶉鹯䴙鸋鹱鹲𬸚鸬鸗鹴鹦鹳鹂鸾卤咸鹾碱盐丽麦麨麸面面𤿲曲麲𪎌曲面麷么么黄黉点党黪霉黡黩黾鼋鼌鼍冬鼹齐斋赍齑齿龀龁龂𬹼龅龇龃龆龄出龈啮齩龊龉齭𬺈𫠜齰龋齴腭龌𬺓齾龙厐庞䶮龓龚龛龟龢龭龯䜤鿒𠀾𠌥𠏢𠐊㓆𠞆𠠎𠬙𠼤𠽃𠿕𡂡𡃄𠴛𡃤𡄔𡄣𠲥𡅯𫭼𡋗𡓁𡋀𡍣㛟𡟫㛿㛠𡭜𡭬𡳃𡸗𡹬岁𡽗㟜𡿖𢍰𢠼𢣐𢘝𢣭𢤩𢤱𢤿𢯷𢶒𢫞𢷮𢬦𢺳暅𣋋𣍐㭣𣜬𣝕𣘓𣞎𣑶𣯩𣯴毶𣽏㳢𣿉𣺽𤄷𣷷𤑳𤑹𤒎𤒻𤓌𤓎𤊰𤘀𤛮𤛱𤜆𤠮𤢟𤢻𤩂㻘㻏𤬅𤳷𤳄𤷃𤸫𤺔𥅿𥅘𥏝𥐰𥐯𥖲𥗇𬒗𥜐𥜰𥞵䅪𥢶𥢷𥨐𥪂𥯤𥴨𥴼𥵃𥵊𥶽𥮋𥻦𥹥𥽖𥾯𥿊𦀖𦂅𦃄𦃩𦅇𦅈𦆲𦒀𦔖𡳒𦟼𦠅𦡝𦢈𦟗𦧺䑽𦪽𦱌𦾟𧎈𧒯𧔥𧕟䘞䙊䘛𧞫𧝧𧡴𧢄𧦝𧦧𧩕䜥𧩼𧫝𧬤𧭈𧭹𧳟䞌𧶔䞎𧷎𧸘𧹈𧽯𨂐𨄣𨅍𨆪𨇁𨇞𨇤𨇰𨇽𨈊𨈌䢀䢁𨊻䢂𨌈𨍰𨎌𨎮𨏠𨏥𨞺𨟊𨢿𨣈𨣞𨣧𨤰𨥛𨥟䦀𬭊䦁𨧰𨧱𬭛𨨛𨨢𨩰𨪕𨫒𨬖𬭶𬭳𨭖𨭸𨮂𨮳䥿𨯟𨰃𨰋𨰥𨰲𨲳𨳑𨳕𨴗𨴹𨵩𨵸𨶀𨶏𨶮𨶲𨷲𨼳𨽏𩀨𩅙𩎖𩎢𩏂𩏠𩏪𩏷𩑔𩒎𩓣𩓥𩔑𩔳𩖰𩗀𩗓𩗴𩘀𩘝𩘹𩘺𩙈𩚛𩚥𩚩𩚵𩛆𩛌𩛡𩛩𩜇𩜦𩜵𩝔𩝽𩞄𩞦䭪𩟐𩟗𩠠𩡣𩡺𩢡𩢴𩢸𩢾𩣏䯃𩣫𩣵𩣺𩤊𩤙𩤲𩤸𩥄𩥇𩥉𩥑𩦠𩧆𩭙𩯁𩯳𩰀𩰹𩳤𩴵𩵦𩵩𩵹𩶁䲞𩶰𩶱𩷰𩸃𩸄𩸡𩸦𩻗𩻬𩻮𩼶𩽇𩿅𩿤𩿪𪀖𪀦𪀾𪁈𪁖𪂆𪃍𪃏𪃒𪃧𪄆𪄕𪅂𪆷𪇳𪈼𪉸𪋿𪌭𪍠𪓰𪔵𪘀𪘯𪙏𪟖𪷓𫒡𫜦𰻝";
const japanese="䀋万与両並乗乱亀予争亘亜仏仮会伝体余併侠価値倶倹偽兎児党内円写凜処刹剣剤剰励労効勅勧勲匀区医単即却厠厳参双収叙台号呉呪唇唖営嘘嘱噛団囲図国圏圧堕塁塡塩増壊壌壮声壱売変奥奨姉姫嬢学宝実寛寝対寿専将尭尽届属岳峡峰巌巣巻帯帰庁広庄床廃弁弐弥弯弾当彦径従御徳徴応恋恒恵悦悩悪惨慎懐戦戯戸戻才払抜択担拝拠拡挙挟挿捜掲掴掻揺摂撃撹数斉斎断旧昼晃晋晩暁暦曁曽条来枢査栄桜桝桟桧検楡楼楽概様槙権横欠欧歓歩歯歳歴残殴殻毎気氷汚没沢沪浄浅浜涙涛渇済渉渋渓温湾湿満溌滝滞潜瀬灯炉点為焔焼煙犠状独狭猟猫献獣瓶産画畳畵痩痴痺発皐盗県真研砕砺礼祢祷禄禅秘称税稜稲穂穏穣窃竃竜粋粛粧粽糸経絵絶継続総緑緒縁縄縦繊繋繍缶群翻聡聴胆脚脱脳臓舎舖舗艶芦芸茎茘荘莱萌葱蒋蔵薫薬虚虫蚕蛍蛮蝉蝋衛装褒覇覚覧観触訳証誉説読謡譲豊賛贋践転軽輌辞辺逓連遅遥郎郷酔醗醤醸釈鉄鉱銭鋭鋳錬録鎮関閲闘陥険随隠隣雑霊静頴頼顔顕餅駅駆駈騒験髄髪鬪鴎鶏鹸麦麹麺黄黒黙鼈齢";
const oldForms="䀋萬與兩竝乘亂龜豫爭亙亞佛假會傳體餘倂侠價値倶儉僞兎兒黨内圓寫凛處刹劍劑剩勵勞效敕勸勳匀區醫單卽却厠嚴參雙收敍臺號呉呪唇啞營嘘囑嚙團圍圖國圈壓墮壘塡鹽增壞壤壯聲壹賣變奧奬姉姫孃學寶實寬寢對壽專將堯盡屆屬嶽峽峰巖巢卷帶歸廳廣庄床廢辨貳彌彎彈當彦徑從御德徵應戀恆惠悦惱惡慘愼懷戰戲戸戾才拂拔擇擔拜據擴擧挾插搜揭掴搔搖攝擊攪數齊齋斷舊晝晄晋晚曉曆曁曾條來樞査榮櫻枡棧檜檢楡樓樂槪樣槇權橫缺歐歡步齒歲歷殘毆殼每氣氷汚没澤濾淨淺濱淚涛渴濟涉澁溪溫灣濕滿溌瀧滯潛瀨燈爐點爲焔燒煙犧狀獨狹獵猫獻獸甁産畫疊畵瘦癡痺發皐盜縣眞硏碎砺禮禰禱祿禪祕稱税稜稻穗穩穰竊竃龍粹肅粧粽絲經繪絶繼續總綠緖緣繩縱纖繋繡罐群飜聡聽膽腳脫腦臟舎舖舗艷蘆藝莖茘莊莱萠葱蔣藏薰藥虛蟲蠶螢蠻蝉蠟衞裝襃霸覺覽觀觸譯證譽說讀謠讓豐贊贋踐轉輕輌辭邊遞連遲遙郞鄕醉醗醬釀釋鐵鑛錢鋭鑄鍊錄鎭關閱鬭陷險隨隱隣雜靈靜穎賴顏顯餠驛驅駈騷驗髓髮鬪鷗鷄鹼麥麴麵黃黑默鼈齡";
 const zipMap=(a,b)=>{const chars=Array.from(b);return new Map(Array.from(a,(c,i)=>[c,chars[i]]))};
 const ts=zipMap(traditional,simplified),jp=zipMap(japanese,oldForms);
 const fold=s=>Array.from(String(s||'').normalize('NFKC'),c=>{const v=jp.get(c)||c;return ts.get(v)||v}).join('');
 const normalize=s=>fold(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');
 function similarity(a,b){
  const x=normalize(a),y=normalize(b);if(!x||!y)return 0;if(x===y)return 1;if(x.includes(y)||y.includes(x))return .65;
  const grams=s=>{const c=Array.from(s);return new Set(c.slice(1).map((v,i)=>c[i]+v))};
  const l=grams(x),r=grams(y);return [...l].filter(v=>r.has(v)).length/Math.max(1,l.size+r.size-[...l].filter(v=>r.has(v)).length)*.5;
 }
 function versionKey(s){
  const v=fold(s).toLowerCase();
  return [/\blive\b|现场|演唱会/,/\binstrumental\b|\boff[\s-]*vocal\b|\bkaraoke\b|伴奏/,/\bremix\b|重混/,/\bacoustic\b|不插电/,/\bradio[\s-]*edit\b/,/\bsped[\s-]*up\b|\bslowed\b/].map((p,i)=>p.test(v)?String(i):'').filter(Boolean).join(',');
 }
 // Providers decorate titles with translations and artists with another-script
 // aliases (for example ヨルシカ (Yorushika)). Compare those metadata forms,
 // while retaining the full title for the independent recording-version gate.
 function metadataForms(value){
  const full=String(value||'').normalize('NFKC').trim(),forms=[full];
  let current=full,match;
  while((match=/^(.*\S)\s*\(([^()]*)\)\s*$/.exec(current))&&!versionKey(match[2])){
   current=match[1].trim();forms.push(current);
  }
  return [...new Set(forms.filter(Boolean))];
 }
 function artistForms(value){
  const full=String(value||'').normalize('NFKC').trim(),forms=[full];
  const match=/^(.*\S)\s*\(([^()]*)\)\s*$/.exec(full);
  if(match&&!/カバー|トリビュート|ライブ|カラオケ|\b(?:cover|tribute|feat|ft|cv|with)\b/iu.test(match[2])){
   const base=match[1].trim(),alias=match[2].trim();
   const nonLatin=s=>/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(s);
   const kana=s=>/[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(s);
   const latin=s=>/^[\p{Script=Latin}\p{N}\s.'’&・ー-]+$/u.test(s)&&/\p{Script=Latin}/u.test(s);
   if((nonLatin(base)&&latin(alias))||(latin(base)&&nonLatin(alias))||kana(alias))forms.push(base,alias);
  }
  return [...new Set(forms.map(normalize).filter(Boolean))];
 }
 function identities(value){
  return String(value||'').normalize('NFKC').split(/, | \/ |、|; /).map(artistForms).filter(forms=>forms.length);
 }
 const metadataSimilarity=(a,b)=>Math.max(0,...metadataForms(a).flatMap(x=>metadataForms(b).map(y=>similarity(x,y))));
 function evaluateMatch(item,track){
  const title=metadataSimilarity(track.title,item.title),a=identities(track.artist),b=identities(item.artist);
  const same=(x,y)=>x.some(name=>y.includes(name));
  const primary=!!a[0]&&!!b[0]&&same(a[0],b[0]);
  const artistScore=a.filter(forms=>b.some(other=>same(forms,other))).length/Math.max(1,a.length,b.length);
  let total=title*40+artistScore*30,weight=70;
  if(track.album&&item.album){total+=metadataSimilarity(track.album,item.album)*10;weight+=10}
  const known=track.durationMs>0&&item.durationMs>0,delta=Math.abs(track.durationMs-item.durationMs);
  if(known){total+=delta<=3000?30:delta<=10000?15:delta<=30000?5:0;weight+=30}
  const score=total/weight;
  return {score,eligible:score>=.8&&title>=.6&&primary&&versionKey(track.title)===versionKey(item.title)&&(!known||delta<=10000)};
 }
 function rankCandidates(items,track){
  return items.map(item=>({...item,...evaluateMatch(item,track)})).filter(x=>x.eligible).sort((a,b)=>b.score-a.score);
 }
 let nativeFetch=null;
 function endpoint(value){
  const url=new URL(value);
  const allowed=(url.hostname==='c.y.qq.com'&&['/soso/fcgi-bin/client_search_cp','/lyric/fcgi-bin/fcg_query_lyric_new.fcg'].includes(url.pathname))||
   (url.hostname==='u.y.qq.com'&&url.pathname==='/cgi-bin/musicu.fcg');
  if(url.protocol!=='https:'||url.username||url.password||url.port||!allowed)throw Error('Unsupported lyric endpoint');
  return url;
 }
 function requestNative(value,signal){
  return new Promise((resolve,reject)=>{
   let url;try{url=endpoint(value)}catch(error){reject(error);return}
   if(signal?.aborted){reject(Error('Cancelled'));return}
   // The native HTTP adapter returns data, not executable JSONP. In CEF 91,
   // about:srcdoc inherits NetEase's CSP and QQ <script> requests are blocked.
   url.searchParams.set('format','json');url.searchParams.delete('callback');url.searchParams.delete('jsonpCallback');
   let settled=false;
   const finish=(value,error)=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',cancel);error?reject(error):resolve(value)};
   const cancel=()=>finish(null,Error('Cancelled'));
   const timer=setTimeout(()=>finish(null,Error('QQ lyric request timed out')),3000);
   signal?.addEventListener('abort',cancel,{once:true});
   Promise.resolve().then(()=>nativeFetch(url.href,signal)).then(response=>{
    if(settled)return;
    try{
     if(response?.code!==0||!(response.status>=200&&response.status<300))throw Error('QQ native HTTP request failed');
     const raw=response.blob??response.body;
     if(typeof raw!=='string'||raw.length>4*1024*1024)throw Error('Invalid QQ JSON response');
     finish(JSON.parse(raw.replace(/^\uFEFF/,'').trim()));
    }catch(error){finish(null,error)}
   },error=>finish(null,error));
  });
 }
 function requestPublicJSON(value,signal){
  return nativeFetch?requestNative(value,signal):isolatedJSONP(value,signal);
 }
 function isolatedJSONP(value,signal){
  return new Promise((resolve,reject)=>{
   let url;try{url=endpoint(value)}catch(error){reject(error);return}
   if(signal?.aborted){reject(Error('Cancelled'));return}
   const token='appleNowPlayingQQ_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2);
   url.searchParams.set('callback','appleNowPlayingQQCallback');url.searchParams.set('jsonpCallback','appleNowPlayingQQCallback');
   const frame=document.createElement('iframe');frame.hidden=true;frame.sandbox='allow-scripts';frame.setAttribute('aria-hidden','true');
   let settled=false;
   function finish(data,error){
    if(settled)return;settled=true;clearTimeout(timer);window.removeEventListener('message',message);signal?.removeEventListener('abort',cancel);frame.remove();
    error?reject(Error(error)):resolve(data);
   }
   const cancel=()=>finish(null,'Cancelled');
   const message=e=>{if(e.source!==frame.contentWindow||e.data?.channel!=='apple-now-playing-qq-lyrics'||e.data?.token!==token)return;finish(e.data.data,e.data.error)};
   const timer=setTimeout(()=>finish(null,'QQ lyric request timed out'),3000);
   window.addEventListener('message',message);signal?.addEventListener('abort',cancel,{once:true});
   function boot(secret,endpoint){
    const send=(data,error)=>parent.postMessage({channel:'apple-now-playing-qq-lyrics',token:secret,data,error},'*');
    window.appleNowPlayingQQCallback=data=>send(data);
    const s=document.createElement('script');s.referrerPolicy='no-referrer';s.src=endpoint;s.onerror=()=>send(null,'QQ script failed');document.head.append(s);
   }
   const args=JSON.stringify(token)+','+JSON.stringify(url.href).replace(/</g,'\\u003c');
   frame.srcdoc='<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\' https://c.y.qq.com https://u.y.qq.com;">'+'<script>('+boot.toString()+')('+args+');</'+'script>';
   document.body.append(frame);
  });
 }
 function createClient(request=requestPublicJSON){
  async function search(query,signal){
   const url=new URL('https://c.y.qq.com/soso/fcgi-bin/client_search_cp');
   url.search=new URLSearchParams({format:'jsonp',w:query,p:'1',n:'30'}).toString();
   const data=await request(url.href,signal);
   if(data?.code!==0)return [];
   return (data.data?.song?.list||[]).map(s=>({
    mid:String(s.songmid||s.mid||''),id:String(s.songid||s.id||''),title:s.songname||s.title||'',
    artist:(s.singer||[]).map(a=>a.name).filter(Boolean).join(' / '),
    album:s.albumname||s.album?.name||'',durationMs:Number(s.interval||0)*1000,
   })).filter(s=>s.mid||/^\d+$/.test(s.id));
  }
  async function lyrics(item,signal){
   try{
    if(/^\d+$/.test(item.id)){
     const data={comm:{ct:24,cv:0,platform:'yqq.json'},req_0:{module:'music.musichallSong.PlayLyricInfo',method:'GetPlayLyricInfo',param:{songMID:item.mid,songID:Number(item.id),crypt:1,qrc:1,roma:1,trans:1}}};
     const url='https://u.y.qq.com/cgi-bin/musicu.fcg?format=jsonp&data='+encodeURIComponent(JSON.stringify(data));
     const response=await request(url,signal),p=response?.req_0?.data;
     if(response?.code===0&&response.req_0.code===0&&String(p?.songID)===item.id&&p.lyric){
      const decode=async raw=>{
       if(!raw||typeof raw!=='string')return '';
       if(raw.trim().startsWith('['))return raw;
       return root.AppleNowPlayingQQCodec?await root.AppleNowPlayingQQCodec.decode(raw):'';
      };
      const content=await decode(p.lyric);
      if(/^\[\d+,\d+\]/m.test(content)){
       const sides=await Promise.all([decode(p.trans).catch(()=>''),decode(p.roma).catch(()=>'')]);
       return {content,format:'qrc',translation:sides[0],romanization:sides[1],candidate:item,url:'https://y.qq.com/n/ryqq/songDetail/'+encodeURIComponent(item.mid)};
      }
     }
    }
   }catch(e){if(signal.aborted)throw e}
   if(signal.aborted||!item.mid)return null;
   const url=new URL('https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg');
   url.search=new URLSearchParams({songmid:item.mid,format:'jsonp',nobase64:'1'}).toString();
   const p=await request(url.href,signal);
   if(p?.code!==0||!p.lyric||!/^\[\d+:\d+(?:\.\d+)?\]/m.test(p.lyric))return null;
   return {content:p.lyric,format:'lrc',translation:p.trans||'',romanization:'',candidate:item,url:'https://y.qq.com/n/ryqq/songDetail/'+encodeURIComponent(item.mid)};
  }
  async function fetchLyrics(track,parentSignal){
   if(!track?.title||!track.artist||parentSignal?.aborted)return null;
   const controller=new AbortController(),cancel=()=>controller.abort();
   parentSignal?.addEventListener('abort',cancel,{once:true});
   const timer=setTimeout(cancel,7000);
   let fallback=null;
   const available=()=>parentSignal?.aborted?null:fallback;
   try{
    const seen=new Set();
    for(const query of [[track.title,track.artist,track.album].filter(Boolean).join(' '),track.title]){
     if(controller.signal.aborted)return available();
     let items;try{items=await search(query,controller.signal)}catch{if(controller.signal.aborted)return available();continue}
     for(const item of rankCandidates(items,track).slice(0,3)){
      const key=item.mid||item.id;if(seen.has(key))continue;seen.add(key);
      try{
       const p=await lyrics(item,controller.signal);
       if(p&&!controller.signal.aborted){if(p.format==='qrc')return p;fallback=fallback||p}
      }catch{if(controller.signal.aborted)return available()}
     }
    }
   }finally{clearTimeout(timer);parentSignal?.removeEventListener('abort',cancel);controller.abort()}
   return available();
  }
  return {fetchLyrics,search,lyrics};
 }
 const client=createClient();
 root.AppleNowPlayingQQLyrics={fetchLyrics:client.fetchLyrics,createClient,rankCandidates,fold,request:requestPublicJSON,
  setNativeFetch(callback){nativeFetch=typeof callback==='function'?callback:null}};
})(typeof window!=='undefined'?window:globalThis);

/* OpenCC character dictionary license copy:
Apache License
Version 2.0, January 2004
http://www.apache.org/licenses/

TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

1. Definitions.

"License" shall mean the terms and conditions for use, reproduction, and distribution as defined by Sections 1 through 9 of this document.

"Licensor" shall mean the copyright owner or entity authorized by the copyright owner that is granting the License.

"Legal Entity" shall mean the union of the acting entity and all other entities that control, are controlled by, or are under common control with that entity. For the purposes of this definition, "control" means (i) the power, direct or indirect, to cause the direction or management of such entity, whether by contract or otherwise, or (ii) ownership of fifty percent (50%) or more of the outstanding shares, or (iii) beneficial ownership of such entity.

"You" (or "Your") shall mean an individual or Legal Entity exercising permissions granted by this License.

"Source" form shall mean the preferred form for making modifications, including but not limited to software source code, documentation source, and configuration files.

"Object" form shall mean any form resulting from mechanical transformation or translation of a Source form, including but not limited to compiled object code, generated documentation, and conversions to other media types.

"Work" shall mean the work of authorship, whether in Source or Object form, made available under the License, as indicated by a copyright notice that is included in or attached to the work (an example is provided in the Appendix below).

"Derivative Works" shall mean any work, whether in Source or Object form, that is based on (or derived from) the Work and for which the editorial revisions, annotations, elaborations, or other modifications represent, as a whole, an original work of authorship. For the purposes of this License, Derivative Works shall not include works that remain separable from, or merely link (or bind by name) to the interfaces of, the Work and Derivative Works thereof.

"Contribution" shall mean any work of authorship, including the original version of the Work and any modifications or additions to that Work or Derivative Works thereof, that is intentionally submitted to Licensor for inclusion in the Work by the copyright owner or by an individual or Legal Entity authorized to submit on behalf of the copyright owner. For the purposes of this definition, "submitted" means any form of electronic, verbal, or written communication sent to the Licensor or its representatives, including but not limited to communication on electronic mailing lists, source code control systems, and issue tracking systems that are managed by, or on behalf of, the Licensor for the purpose of discussing and improving the Work, but excluding communication that is conspicuously marked or otherwise designated in writing by the copyright owner as "Not a Contribution."

"Contributor" shall mean Licensor and any individual or Legal Entity on behalf of whom a Contribution has been received by Licensor and subsequently incorporated within the Work.

2. Grant of Copyright License. Subject to the terms and conditions of this License, each Contributor hereby grants to You a perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable copyright license to reproduce, prepare Derivative Works of, publicly display, publicly perform, sublicense, and distribute the Work and such Derivative Works in Source or Object form.

3. Grant of Patent License. Subject to the terms and conditions of this License, each Contributor hereby grants to You a perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable (except as stated in this section) patent license to make, have made, use, offer to sell, sell, import, and otherwise transfer the Work, where such license applies only to those patent claims licensable by such Contributor that are necessarily infringed by their Contribution(s) alone or by combination of their Contribution(s) with the Work to which such Contribution(s) was submitted. If You institute patent litigation against any entity (including a cross-claim or counterclaim in a lawsuit) alleging that the Work or a Contribution incorporated within the Work constitutes direct or contributory patent infringement, then any patent licenses granted to You under this License for that Work shall terminate as of the date such litigation is filed.

4. Redistribution. You may reproduce and distribute copies of the Work or Derivative Works thereof in any medium, with or without modifications, and in Source or Object form, provided that You meet the following conditions:

   1. You must give any other recipients of the Work or Derivative Works a copy of this License; and

   2. You must cause any modified files to carry prominent notices stating that You changed the files; and

   3. You must retain, in the Source form of any Derivative Works that You distribute, all copyright, patent, trademark, and attribution notices from the Source form of the Work, excluding those notices that do not pertain to any part of the Derivative Works; and

   4. If the Work includes a "NOTICE" text file as part of its distribution, then any Derivative Works that You distribute must include a readable copy of the attribution notices contained within such NOTICE file, excluding those notices that do not pertain to any part of the Derivative Works, in at least one of the following places: within a NOTICE text file distributed as part of the Derivative Works; within the Source form or documentation, if provided along with the Derivative Works; or, within a display generated by the Derivative Works, if and wherever such third-party notices normally appear. The contents of the NOTICE file are for informational purposes only and do not modify the License. You may add Your own attribution notices within Derivative Works that You distribute, alongside or as an addendum to the NOTICE text from the Work, provided that such additional attribution notices cannot be construed as modifying the License.

You may add Your own copyright statement to Your modifications and may provide additional or different license terms and conditions for use, reproduction, or distribution of Your modifications, or for any such Derivative Works as a whole, provided Your use, reproduction, and distribution of the Work otherwise complies with the conditions stated in this License.

5. Submission of Contributions. Unless You explicitly state otherwise, any Contribution intentionally submitted for inclusion in the Work by You to the Licensor shall be under the terms and conditions of this License, without any additional terms or conditions. Notwithstanding the above, nothing herein shall supersede or modify the terms of any separate license agreement you may have executed with Licensor regarding such Contributions.

6. Trademarks. This License does not grant permission to use the trade names, trademarks, service marks, or product names of the Licensor, except as required for reasonable and customary use in describing the origin of the Work and reproducing the content of the NOTICE file.

7. Disclaimer of Warranty. Unless required by applicable law or agreed to in writing, Licensor provides the Work (and each Contributor provides its Contributions) on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied, including, without limitation, any warranties or conditions of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A PARTICULAR PURPOSE. You are solely responsible for determining the appropriateness of using or redistributing the Work and assume any risks associated with Your exercise of permissions under this License.

8. Limitation of Liability. In no event and under no legal theory, whether in tort (including negligence), contract, or otherwise, unless required by applicable law (such as deliberate and grossly negligent acts) or agreed to in writing, shall any Contributor be liable to You for damages, including any direct, indirect, special, incidental, or consequential damages of any character arising as a result of this License or out of the use or inability to use the Work (including but not limited to damages for loss of goodwill, work stoppage, computer failure or malfunction, or any and all other commercial damages or losses), even if such Contributor has been advised of the possibility of such damages.

9. Accepting Warranty or Additional Liability. While redistributing the Work or Derivative Works thereof, You may choose to offer, and charge a fee for, acceptance of support, warranty, indemnity, or other liability obligations and/or rights consistent with this License. However, in accepting such obligations, You may act only on Your own behalf and on Your sole responsibility, not on behalf of any other Contributor, and only if You agree to indemnify, defend, and hold each Contributor harmless for any liability incurred by, or claims asserted against, such Contributor by reason of your accepting any such warranty or additional liability.

END OF TERMS AND CONDITIONS

*/


/* BetterNCM UI helper. A short hidden process resolves Pictures only; it never downloads images.
 * API: https://github.com/BetterNCM/BetterNCM-Plugin-Template-ESBuild/blob/main/src/global.d.ts
 * Hidden/non-elevated exec: https://github.com/std-microblock/chromatic/blob/1.3.4/src/utils/utils.cpp
 */
(function (root) {
  'use strict';

  const TIMEOUT = 30000;
  const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
  const windowsPath = value => typeof value === 'string' && /^[A-Za-z]:[\\/]/.test(value) && !/[\0\r\n]/.test(value);
  const join = (base, name) => base.replace(/[\\/]+$/, '') + '\\' + name;
  const existsValue = value => value === true || value === 'true';
  const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

  function fail(message, code) {
    const error = new Error(message);
    error.code = code;
    return error;
  }

  function aborted(signal) {
    if (!signal.aborted) return;
    if (signal.reason instanceof Error) throw signal.reason;
    const error = fail('已取消保存封面', 'ABORTED');
    error.name = 'AbortError';
    throw error;
  }

  function guard(promise, signal) {
    aborted(signal);
    return new Promise((resolve, reject) => {
      const cancel = () => { try { aborted(signal); } catch (error) { reject(error); } };
      signal.addEventListener('abort', cancel, { once: true });
      Promise.resolve(promise).then(resolve, reject).finally(() => signal.removeEventListener('abort', cancel));
    });
  }

  function filename(value) {
    let name = String(value || '歌曲封面').normalize('NFC')
      .replace(/[\x00-\x1f<>:"/\\|?*]/g, '_').replace(/[. ]+$/g, '').trim();
    name = Array.from(name).slice(0, 100).join('').replace(/[. ]+$/g, '') || '歌曲封面';
    if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(name)) name = '_' + name;
    return name;
  }

  function powershellEncoded(script) {
    let binary = '';
    for (let i = 0; i < script.length; i++) {
      const code = script.charCodeAt(i);
      binary += String.fromCharCode(code & 255, code >>> 8);
    }
    return root.btoa(binary);
  }

  async function extension(blob, signal) {
    const bytes = new Uint8Array(await guard(blob.slice(0, 32).arrayBuffer(), signal));
    if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'jpg';
    if ([137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte)) return 'png';
    const ascii = String.fromCharCode(...bytes);
    if (ascii.startsWith('GIF87a') || ascii.startsWith('GIF89a')) return 'gif';
    if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP') return 'webp';
    if (ascii.slice(4, 8) === 'ftyp' && /avif|avis/.test(ascii.slice(8))) return 'avif';
    throw fail('封面响应不是受支持的图片，未保存文件', 'INVALID_IMAGE');
  }

  function createSaver(dependencies = {}) {
    const native = root.betterncm || {};
    const fs = dependencies.fs || native.fs;
    const app = dependencies.app || native.app;
    const fetchImage = dependencies.fetch || root.fetch?.bind(root);
    const reservations = new Set();
    let picturesPromise = null;

    function requireApis() {
      if (!fs || !['mkdir', 'exists', 'writeFile', 'readFileText', 'remove'].every(key => typeof fs[key] === 'function') ||
          !app || typeof app.exec !== 'function' || (!dependencies.dataPath && typeof app.getDataPath !== 'function') ||
          typeof fetchImage !== 'function' || typeof root.btoa !== 'function') {
        throw fail('当前 BetterNCM 缺少保存封面所需的文件接口', 'UNSUPPORTED_HOST');
      }
    }

    async function resolvePictures() {
      const base = typeof dependencies.dataPath === 'function' ? await dependencies.dataPath() :
        (dependencies.dataPath || await app.getDataPath());
      if (!windowsPath(base)) throw fail('无法确定 BetterNCM 临时目录', 'INVALID_DATA_PATH');
      const token = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
      const temporary = join(base, '.apple-now-playing-cover-pictures-' + token + '.txt');
      // The only interpolated value is the host's own data path, quoted as a PowerShell literal.
      // Cover URLs, song IDs and song names never enter this command.
      const literal = "'" + temporary.replace(/'/g, "''") + "'";
      const script = "$ErrorActionPreference='Stop';" +
        "$p=[Environment]::GetFolderPath([Environment+SpecialFolder]::MyPictures);" +
        "if([String]::IsNullOrWhiteSpace($p)){" +
        "$u=[Environment]::GetFolderPath([Environment+SpecialFolder]::UserProfile);" +
        "if([String]::IsNullOrWhiteSpace($u)){throw 'No user profile'};" +
        "$p=[IO.Path]::Combine($u,'Pictures')};" +
        '[IO.File]::WriteAllText(' + literal + ',$p,(New-Object Text.UTF8Encoding($false)))';
      const command = 'powershell.exe -NoLogo -NoProfile -NonInteractive -WindowStyle Hidden -EncodedCommand ' + powershellEncoded(script);
      const deadline = Date.now() + 10000;
      try {
        // BetterNCM exec(cmd, elevate, showWindow): false,false maps to open + SW_HIDE.
        // It reports launch only, so wait for the resulting path file before continuing.
        const launched = await app.exec(command, false, false);
        if (launched === false) throw fail('无法启动图片目录解析', 'PATH_RESOLUTION_FAILED');
        while (Date.now() < deadline) {
          if (existsValue(await fs.exists(temporary))) {
            const path = String(await fs.readFileText(temporary)).replace(/^\uFEFF/, '').trim();
            if (windowsPath(path)) return path.replace(/[\\/]+$/, '');
          }
          await sleep(80);
        }
        throw fail('无法取得当前用户的图片目录，请检查 PowerShell 是否可用', 'PATH_RESOLUTION_FAILED');
      } finally {
        // Keep this bounded resolver alive after a cancelled download to collect/remove its path file.
        try { if (existsValue(await fs.exists(temporary))) await fs.remove(temporary); } catch (_) { /* best effort */ }
      }
    }

    function picturesPath() {
      if (!picturesPromise) picturesPromise = resolvePictures().catch(error => { picturesPromise = null; throw error; });
      return picturesPromise;
    }

    async function reserve(directory, basename, suffix, signal) {
      for (let index = 1; index < 10000; index++) {
        aborted(signal);
        const path = join(directory, basename + (index === 1 ? '' : ' (' + index + ')') + '.' + suffix);
        if (reservations.has(path)) continue;
        // Reserve before awaiting fs so concurrent clicks cannot choose the same candidate.
        reservations.add(path);
        try {
          if (!existsValue(await guard(fs.exists(path), signal))) return path;
        } catch (error) { reservations.delete(path); throw error; }
        reservations.delete(path);
      }
      throw fail('同名封面过多，请调整歌曲名后重试', 'NAME_CONFLICT');
    }

    async function save(track, parentSignal) {
      requireApis();
      const controller = new AbortController();
      const signal = controller.signal;
      const cancel = () => controller.abort(parentSignal?.reason);
      if (parentSignal?.aborted) cancel();
      else parentSignal?.addEventListener('abort', cancel, { once: true });
      let timedOut = false;
      const timer = setTimeout(() => { timedOut = true; controller.abort(); }, TIMEOUT);
      let path = null;
      let writing = null;
      let completed = false;
      try {
        aborted(signal);
        const snapshot = { url: String(track?.url || ''), name: String(track?.name || track?.id || '歌曲封面') };
        let url;
        try { url = new URL(snapshot.url); } catch (_) { throw fail('当前歌曲没有可保存的封面', 'INVALID_URL'); }
        if (!/^https?:$/.test(url.protocol) || url.username || url.password) throw fail('当前封面地址不受支持', 'INVALID_URL');
        const response = await guard(fetchImage(url.href, { signal, credentials: 'omit' }), signal);
        if (!response.ok) throw fail('封面下载失败（HTTP ' + response.status + '）', 'DOWNLOAD_FAILED');
        const declaredSize = Number(response.headers?.get?.('content-length'));
        if (declaredSize > MAX_IMAGE_SIZE) throw fail('封面图片过大，未保存', 'IMAGE_TOO_LARGE');
        const blob = await guard(response.blob(), signal);
        if (!blob.size || blob.size > MAX_IMAGE_SIZE) throw fail('封面图片为空或过大，未保存', 'INVALID_IMAGE');
        const suffix = await extension(blob, signal);
        const directory = join(await guard(picturesPath(), signal), 'CloudMusicImage');
        aborted(signal);
        await guard(fs.mkdir(directory), signal);
        if (!existsValue(await guard(fs.exists(directory), signal))) throw fail('无法创建封面保存目录', 'DIRECTORY_FAILED');
        path = await reserve(directory, filename(snapshot.name), suffix, signal);
        aborted(signal);
        writing = Promise.resolve(fs.writeFile(path, blob));
        await guard(writing, signal);
        aborted(signal);
        if (!existsValue(await guard(fs.exists(path), signal))) throw fail('封面写入失败，请检查图片目录权限', 'WRITE_FAILED');
        completed = true;
        return path;
      } catch (error) {
        // Older CEF does not expose AbortSignal.reason; keep timeout feedback explicit.
        if (timedOut) throw fail('保存封面超时，请重试', 'TIMEOUT');
        if (signal.aborted) aborted(signal);
        if (error?.code) throw error;
        throw fail('保存封面失败：' + (error?.message || '请检查网络和目录权限'), 'SAVE_FAILED');
      } finally {
        clearTimeout(timer);
        parentSignal?.removeEventListener('abort', cancel);
        if (path && !completed) {
          const cleanupPath = path;
          const cleanup = () => Promise.resolve().then(() => fs.remove(cleanupPath)).catch(() => {});
          // A native write already in flight cannot be interrupted; remove only our new file afterwards.
          if (writing) writing.then(cleanup, cleanup).finally(() => reservations.delete(cleanupPath)).catch(() => {});
          else { reservations.delete(cleanupPath); }
        } else if (path) reservations.delete(path);
      }
    }

    return Object.freeze({ save });
  }

  const defaultSaver = createSaver();
  root.AppleNowPlayingCoverSave = Object.freeze({ createSaver, save: defaultSaver.save });
})(typeof window !== 'undefined' ? window : globalThis);

"use strict";
var ExtSpotify = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // node_modules/bezier-easing/src/index.js
  var require_src = __commonJS({
    "node_modules/bezier-easing/src/index.js"(exports, module) {
      var NEWTON_ITERATIONS = 4;
      var NEWTON_MIN_SLOPE = 1e-3;
      var SUBDIVISION_PRECISION = 1e-7;
      var SUBDIVISION_MAX_ITERATIONS = 10;
      var kSplineTableSize = 11;
      var kSampleStepSize = 1 / (kSplineTableSize - 1);
      var float32ArraySupported = typeof Float32Array === "function";
      function A(aA1, aA2) {
        return 1 - 3 * aA2 + 3 * aA1;
      }
      function B(aA1, aA2) {
        return 3 * aA2 - 6 * aA1;
      }
      function C(aA1) {
        return 3 * aA1;
      }
      function calcBezier(aT, aA1, aA2) {
        return ((A(aA1, aA2) * aT + B(aA1, aA2)) * aT + C(aA1)) * aT;
      }
      function getSlope(aT, aA1, aA2) {
        return 3 * A(aA1, aA2) * aT * aT + 2 * B(aA1, aA2) * aT + C(aA1);
      }
      function binarySubdivide(aX, aA, aB, mX1, mX2) {
        var currentX, currentT, i = 0;
        do {
          currentT = aA + (aB - aA) / 2;
          currentX = calcBezier(currentT, mX1, mX2) - aX;
          if (currentX > 0) {
            aB = currentT;
          } else {
            aA = currentT;
          }
        } while (Math.abs(currentX) > SUBDIVISION_PRECISION && ++i < SUBDIVISION_MAX_ITERATIONS);
        return currentT;
      }
      function newtonRaphsonIterate(aX, aGuessT, mX1, mX2) {
        for (var i = 0; i < NEWTON_ITERATIONS; ++i) {
          var currentSlope = getSlope(aGuessT, mX1, mX2);
          if (currentSlope === 0) {
            return aGuessT;
          }
          var currentX = calcBezier(aGuessT, mX1, mX2) - aX;
          aGuessT -= currentX / currentSlope;
        }
        return aGuessT;
      }
      function LinearEasing(x) {
        return x;
      }
      module.exports = function bezier2(mX1, mY1, mX2, mY2) {
        if (!(0 <= mX1 && mX1 <= 1 && 0 <= mX2 && mX2 <= 1)) {
          throw new Error("bezier x values must be in [0, 1] range");
        }
        if (mX1 === mY1 && mX2 === mY2) {
          return LinearEasing;
        }
        var sampleValues = float32ArraySupported ? new Float32Array(kSplineTableSize) : new Array(kSplineTableSize);
        for (var i = 0; i < kSplineTableSize; ++i) {
          sampleValues[i] = calcBezier(i * kSampleStepSize, mX1, mX2);
        }
        function getTForX(aX) {
          var intervalStart = 0;
          var currentSample = 1;
          var lastSample = kSplineTableSize - 1;
          for (; currentSample !== lastSample && sampleValues[currentSample] <= aX; ++currentSample) {
            intervalStart += kSampleStepSize;
          }
          --currentSample;
          var dist = (aX - sampleValues[currentSample]) / (sampleValues[currentSample + 1] - sampleValues[currentSample]);
          var guessForT = intervalStart + dist * kSampleStepSize;
          var initialSlope = getSlope(guessForT, mX1, mX2);
          if (initialSlope >= NEWTON_MIN_SLOPE) {
            return newtonRaphsonIterate(aX, guessForT, mX1, mX2);
          } else if (initialSlope === 0) {
            return guessForT;
          } else {
            return binarySubdivide(aX, intervalStart, intervalStart + kSampleStepSize, mX1, mX2);
          }
        }
        return function BezierEasing(x) {
          if (x === 0) {
            return 0;
          }
          if (x === 1) {
            return 1;
          }
          return calcBezier(getTForX(x), mY1, mY2);
        };
      };
    }
  });

  // src/lyric-player/dom/index.ts
  var dom_exports = {};
  __export(dom_exports, {
    DomLyricPlayer: () => DomLyricPlayer,
    LyricLineMouseEvent: () => LyricLineMouseEvent
  });

  // src/styles/lyric-player.module.css
  var lyric_player_default = {
    lyricLine: "lyric_player_lyricLine",
    lyricBgLine: "lyric_player_lyricBgLine",
    active: "lyric_player_active",
    lyricDuetLine: "lyric_player_lyricDuetLine",
    lyricMainLine: "lyric_player_lyricMainLine",
    emphasizeWrapper: "lyric_player_emphasizeWrapper",
    emphasize: "lyric_player_emphasize",
    lyricSubLine: "lyric_player_lyricSubLine",
    disableSpring: "lyric_player_disableSpring",
    interludeDots: "lyric_player_interludeDots",
    enabled: "lyric_player_enabled",
    duet: "lyric_player_duet",
    tmpDisableTransition: "lyric_player_tmpDisableTransition"
  };

  // src/lyric-player/dom/browse-column.ts
  function firstIndex(length, matches) {
    let low = 0, high = length;
    while (low < high) {
      const mid = low + high >>> 1;
      if (matches(mid)) high = mid;
      else low = mid + 1;
    }
    return low;
  }
  var BrowseColumn = class {
    constructor(layer, dots, offset) {
      this.layer = layer;
      this.dots = dots;
      this.dotsTop = dots.top + offset;
      this.layoutOffset = offset;
      layer.classList.add("anp-browsing-column");
    }
    rows = [];
    all = [];
    mounted = /* @__PURE__ */ new Map();
    first = -1;
    end = -1;
    offset = NaN;
    layoutOffset = 0;
    origin = 0;
    anchor(y) {
      if (!this.rows.length || !Number.isFinite(this.offset)) return;
      const index = firstIndex(this.rows.length, (i) => this.rows[i].top + this.rows[i].height > y + this.offset);
      const row = this.rows[Math.min(index, this.rows.length - 1)];
      return { line: row.line, y: row.top - this.offset };
    }
    get presentedOffset() {
      return Number.isFinite(this.offset) ? this.offset : this.layoutOffset;
    }
    setRows(all, offset, dotsTop) {
      this.dotsTop = dotsTop ?? this.dotsTop + offset - this.presentedOffset;
      if (!this.all.length) {
        for (const row of all) {
          if (row.line.getElement().parentElement === this.layer) this.mounted.set(row.line, null);
        }
      }
      if (Number.isFinite(this.offset)) {
        this.origin += offset - this.offset;
        this.offset = offset;
      }
      this.layoutOffset = offset;
      this.all = all;
      this.rows = all.filter((row) => row.height > 0);
      this.first = this.end = -1;
    }
    screenTop(index) {
      return this.all[index].top - (Number.isFinite(this.offset) ? this.offset : 0);
    }
    move(offset, height) {
      if (this.first >= 0 && offset === this.offset) return;
      const rows = this.rows;
      const first = firstIndex(rows.length, (i) => rows[i].top + rows[i].height > offset - 1);
      const end = firstIndex(rows.length, (i) => rows[i].top >= offset + height + 1);
      if (first !== this.first || end !== this.end) {
        const nearby = rows.slice(first, end);
        if (!Number.isFinite(this.offset) || !nearby.some((row) => this.mounted.has(row.line))) {
          this.origin = rows[first]?.top ?? 0;
        }
        // Hold already built neighbours across small scroll reversals.
        if (first > 0 && this.mounted.has(rows[first - 1].line)) nearby.unshift(rows[first - 1]);
        if (end < rows.length && this.mounted.has(rows[end].line)) nearby.push(rows[end]);
        const retained = new Set(nearby.map((row) => row.line));
        for (const line of this.mounted.keys()) {
          if (retained.has(line)) continue;
          line.leaveBrowseWindow();
          this.mounted.delete(line);
        }
        for (const row of nearby) {
          const y = row.top - this.origin, previous = this.mounted.get(row.line);
          if (previous && Math.abs(previous.y - y) < 1e-3 && previous.scale === row.scale && previous.opacity === row.opacity) continue;
          row.line.placeInBrowse(y, row.scale, row.opacity);
          this.mounted.set(row.line, { y, scale: row.scale, opacity: row.opacity });
        }
        this.first = first;
        this.end = end;
      }
      this.offset = offset;
      // Rows and dots share the layer's rebased origin while browsing.
      this.dots.setTransform(0, this.dotsTop - this.origin);
      this.layer.style.transform = `translate3d(0,${this.origin - offset}px,0)`;
    }
    updateReadingState(time) {
      for (const line of this.mounted.keys()) line.updateReadingState(time);
    }
    finish() {
      if (Number.isFinite(this.offset)) {
        for (const row of this.all) row.line.lineTransforms.posY.setPosition(row.top - this.offset);
        for (const line of this.mounted.keys()) line.show();
        this.dots.setTransform(0, this.dotsTop - this.offset);
      }
      this.layer.style.removeProperty("transform");
      this.layer.classList.remove("anp-browsing-column");
    }
  };

  // node_modules/@ungap/structured-clone/esm/types.js
  var VOID = -1;
  var PRIMITIVE = 0;
  var ARRAY = 1;
  var OBJECT = 2;
  var DATE = 3;
  var REGEXP = 4;
  var MAP = 5;
  var SET = 6;
  var ERROR = 7;
  var BIGINT = 8;

  // node_modules/@ungap/structured-clone/esm/deserialize.js
  var env = typeof self === "object" ? self : globalThis;
  var deserializer = ($, _) => {
    const as = (out, index) => {
      $.set(index, out);
      return out;
    };
    const unpair = (index) => {
      if ($.has(index))
        return $.get(index);
      const [type, value] = _[index];
      switch (type) {
        case PRIMITIVE:
        case VOID:
          return as(value, index);
        case ARRAY: {
          const arr = as([], index);
          for (const index2 of value)
            arr.push(unpair(index2));
          return arr;
        }
        case OBJECT: {
          const object = as({}, index);
          for (const [key, index2] of value)
            object[unpair(key)] = unpair(index2);
          return object;
        }
        case DATE:
          return as(new Date(value), index);
        case REGEXP: {
          const { source, flags } = value;
          return as(new RegExp(source, flags), index);
        }
        case MAP: {
          const map = as(/* @__PURE__ */ new Map(), index);
          for (const [key, index2] of value)
            map.set(unpair(key), unpair(index2));
          return map;
        }
        case SET: {
          const set = as(/* @__PURE__ */ new Set(), index);
          for (const index2 of value)
            set.add(unpair(index2));
          return set;
        }
        case ERROR: {
          const { name, message } = value;
          return as(new env[name](message), index);
        }
        case BIGINT:
          return as(BigInt(value), index);
        case "BigInt":
          return as(Object(BigInt(value)), index);
      }
      return as(new env[type](value), index);
    };
    return unpair;
  };
  var deserialize = (serialized) => deserializer(/* @__PURE__ */ new Map(), serialized)(0);

  // node_modules/@ungap/structured-clone/esm/serialize.js
  var EMPTY = "";
  var { toString } = {};
  var { keys } = Object;
  var typeOf = (value) => {
    const type = typeof value;
    if (type !== "object" || !value)
      return [PRIMITIVE, type];
    const asString = toString.call(value).slice(8, -1);
    switch (asString) {
      case "Array":
        return [ARRAY, EMPTY];
      case "Object":
        return [OBJECT, EMPTY];
      case "Date":
        return [DATE, EMPTY];
      case "RegExp":
        return [REGEXP, EMPTY];
      case "Map":
        return [MAP, EMPTY];
      case "Set":
        return [SET, EMPTY];
    }
    if (asString.includes("Array"))
      return [ARRAY, asString];
    if (asString.includes("Error"))
      return [ERROR, asString];
    return [OBJECT, asString];
  };
  var shouldSkip = ([TYPE, type]) => TYPE === PRIMITIVE && (type === "function" || type === "symbol");
  var serializer = (strict, json, $, _) => {
    const as = (out, value) => {
      const index = _.push(out) - 1;
      $.set(value, index);
      return index;
    };
    const pair = (value) => {
      if ($.has(value))
        return $.get(value);
      let [TYPE, type] = typeOf(value);
      switch (TYPE) {
        case PRIMITIVE: {
          let entry = value;
          switch (type) {
            case "bigint":
              TYPE = BIGINT;
              entry = value.toString();
              break;
            case "function":
            case "symbol":
              if (strict)
                throw new TypeError("unable to serialize " + type);
              entry = null;
              break;
            case "undefined":
              return as([VOID], value);
          }
          return as([TYPE, entry], value);
        }
        case ARRAY: {
          if (type)
            return as([type, [...value]], value);
          const arr = [];
          const index = as([TYPE, arr], value);
          for (const entry of value)
            arr.push(pair(entry));
          return index;
        }
        case OBJECT: {
          if (type) {
            switch (type) {
              case "BigInt":
                return as([type, value.toString()], value);
              case "Boolean":
              case "Number":
              case "String":
                return as([type, value.valueOf()], value);
            }
          }
          if (json && "toJSON" in value)
            return pair(value.toJSON());
          const entries = [];
          const index = as([TYPE, entries], value);
          for (const key of keys(value)) {
            if (strict || !shouldSkip(typeOf(value[key])))
              entries.push([pair(key), pair(value[key])]);
          }
          return index;
        }
        case DATE:
          return as([TYPE, value.toISOString()], value);
        case REGEXP: {
          const { source, flags } = value;
          return as([TYPE, { source, flags }], value);
        }
        case MAP: {
          const entries = [];
          const index = as([TYPE, entries], value);
          for (const [key, entry] of value) {
            if (strict || !(shouldSkip(typeOf(key)) || shouldSkip(typeOf(entry))))
              entries.push([pair(key), pair(entry)]);
          }
          return index;
        }
        case SET: {
          const entries = [];
          const index = as([TYPE, entries], value);
          for (const entry of value) {
            if (strict || !shouldSkip(typeOf(entry)))
              entries.push(pair(entry));
          }
          return index;
        }
      }
      const { message } = value;
      return as([TYPE, { name: type, message }], value);
    };
    return pair;
  };
  var serialize = (value, { json, lossy } = {}) => {
    const _ = [];
    return serializer(!(json || lossy), !!json, /* @__PURE__ */ new Map(), _)(value), _;
  };

  // node_modules/@ungap/structured-clone/esm/index.js
  var esm_default = typeof structuredClone === "function" ? (
    /* c8 ignore start */
    (any, options) => options && ("json" in options || "lossy" in options) ? deserialize(serialize(any, options)) : structuredClone(any)
  ) : (any, options) => deserialize(serialize(any, options));

  // src/utils/eq-set.ts
  var eqSet = (xs, ys) => xs.size === ys.size && [...xs].every((x) => ys.has(x));

  // src/utils/derivative.ts
  function derivative(f) {
    const h = 1e-3;
    return (x) => (f(x + h) - f(x - h)) / (2 * h);
  }
  function getVelocity(f) {
    return derivative(f);
  }

  // src/utils/spring.ts
  var zeroVelocity = () => 0;
  var Spring = class {
    currentPosition = 0;
    targetPosition = 0;
    currentTime = 0;
    params = {};
    resting = true;
    holdPosition = () => this.targetPosition;
    currentSolver = this.holdPosition;
    getV = zeroVelocity;
    getV2 = zeroVelocity;
    queueParams;
    queuePosition;
    constructor(currentPosition = 0) {
      this.targetPosition = currentPosition;
      this.currentPosition = this.targetPosition;
    }
    resetSolver() {
      const curV = this.getV(this.currentTime);
      this.resting = false;
      this.currentTime = 0;
      this.currentSolver = solveSpring(
        this.currentPosition,
        curV,
        this.targetPosition,
        0,
        this.params
      );
      this.getV = getVelocity(this.currentSolver);
      this.getV2 = getVelocity(this.getV);
    }
    get idle() {
      return this.resting && !this.queueParams && !this.queuePosition;
    }
    arrived() {
      return Math.abs(this.targetPosition - this.currentPosition) < 0.01 && this.getV(this.currentTime) < 0.01 && this.getV2(this.currentTime) < 0.01 && this.queueParams === void 0 && this.queuePosition === void 0;
    }
    setPosition(targetPosition) {
      this.targetPosition = targetPosition;
      this.currentPosition = targetPosition;
      this.currentSolver = this.holdPosition;
      this.getV = this.getV2 = zeroVelocity;
      this.resting = true;
    }
    update(delta = 0) {
      if (this.resting && !this.queueParams && !this.queuePosition) return;
      if (!this.resting) {
        this.currentTime += delta;
        this.currentPosition = this.currentSolver(this.currentTime);
      }
      if (this.queueParams) {
        this.queueParams.time -= delta;
        if (this.queueParams.time <= 0) {
          const { time, ...params } = this.queueParams;
          this.queueParams = void 0;
          this.applyParams(params);
        }
      }
      if (this.queuePosition) {
        this.queuePosition.time -= delta;
        if (this.queuePosition.time <= 0) {
          this.setTargetPosition(this.queuePosition.position);
        }
      }
      if (!this.resting && this.arrived()) {
        this.setPosition(this.targetPosition);
      }
    }
    updateParams(params, delay = 0) {
      if (delay > 0) {
        this.queueParams = {
          ...params,
          time: delay
        };
      } else {
        this.queuePosition = void 0;
        this.applyParams(params);
      }
    }
    applyParams(params) {
      this.params = { ...this.params, ...params };
      if (!this.resting) this.resetSolver();
    }
    setTargetPosition(targetPosition, delay = 0) {
      if (delay > 0) {
        this.queuePosition = {
          ...this.queuePosition ?? {},
          position: targetPosition,
          time: delay
        };
      } else {
        this.queuePosition = void 0;
        if (this.resting && this.currentPosition === targetPosition) return;
        this.targetPosition = targetPosition;
        this.resetSolver();
      }
    }
    getCurrentPosition() {
      return this.currentPosition;
    }
  };
  function solveSpring(from, velocity, to, delay = 0, params) {
    const soft = params?.soft ?? false;
    const stiffness = params?.stiffness ?? 100;
    const damping = params?.damping ?? 10;
    const mass = params?.mass ?? 1;
    const delta = to - from;
    if (soft || 1 <= damping / (2 * Math.sqrt(stiffness * mass))) {
      const angular_frequency = -Math.sqrt(stiffness / mass);
      const leftover2 = -angular_frequency * delta - velocity;
      return (t) => {
        t -= delay;
        if (t < 0) return from;
        return to - (delta + t * leftover2) * Math.E ** (t * angular_frequency);
      };
    }
    const damping_frequency = Math.sqrt(4 * mass * stiffness - damping ** 2);
    const leftover = (damping * delta - 2 * mass * velocity) / damping_frequency;
    const dfm = 0.5 * damping_frequency / mass;
    const dm = -(0.5 * damping) / mass;
    return (t) => {
      t -= delay;
      if (t < 0) return from;
      return to - (Math.cos(t * dfm) * delta + Math.sin(t * dfm) * leftover) * Math.E ** (t * dm);
    };
  }

  // src/lyric-player/bottom-line.ts
  var BottomLineEl = class {
    constructor(lyricPlayer) {
      this.lyricPlayer = lyricPlayer;
      this.element.setAttribute("class", lyric_player_default.lyricLine);
      this.rebuildStyle();
    }
    element = document.createElement("div");
    left = 0;
    top = 0;
    delay = 0;
    // 由 LyricPlayer 来设置
    lineSize = [0, 0];
    lineTransforms = {
      posX: new Spring(0),
      posY: new Spring(0)
    };
    measureSize() {
      const size = [
        this.element.clientWidth,
        this.element.clientHeight
      ];
      return size;
    }
    lastStyle = "";
    show() {
      this.rebuildStyle();
    }
    hide() {
      this.rebuildStyle();
    }
    rebuildStyle() {
      let style = `transform:translate(${this.lineTransforms.posX.getCurrentPosition().toFixed(2)}px,${this.lineTransforms.posY.getCurrentPosition().toFixed(2)}px);`;
      if (!this.lyricPlayer.getEnableSpring() && this.isInSight) {
        style += `transition-delay:${this.delay}ms;`;
      }
      if (style !== this.lastStyle) {
        this.lastStyle = style;
        this.element.setAttribute("style", style);
      }
    }
    getElement() {
      return this.element;
    }
    setTransform(left = this.left, top = this.top, force = false, delay = 0) {
      this.left = left;
      this.top = top;
      this.delay = delay * 1e3 | 0;
      if (force || !this.lyricPlayer.getEnableSpring()) {
        if (force) this.element.classList.add(lyric_player_default.tmpDisableTransition);
        this.lineTransforms.posX.setPosition(left);
        this.lineTransforms.posY.setPosition(top);
        if (!this.lyricPlayer.getEnableSpring()) this.show();
        else this.rebuildStyle();
        if (force)
          requestAnimationFrame(() => {
            this.element.classList.remove(lyric_player_default.tmpDisableTransition);
          });
      } else {
        this.lineTransforms.posX.setTargetPosition(left, delay);
        this.lineTransforms.posY.setTargetPosition(top, delay);
      }
    }
    update(delta = 0) {
      if (!this.lyricPlayer.getEnableSpring()) return;
      this.lineTransforms.posX.update(delta);
      this.lineTransforms.posY.update(delta);
      if (this.isInSight) {
        this.show();
      } else {
        this.hide();
      }
    }
    get isInSight() {
      const l = this.lineTransforms.posX.getCurrentPosition();
      const t = this.lineTransforms.posY.getCurrentPosition();
      const r = l + this.lineSize[0];
      const b = t + this.lineSize[1];
      const pr = this.lyricPlayer.size[0];
      const pb = this.lyricPlayer.size[1];
      return !(l > pr || t > pb || r < 0 || b < 0);
    }
    dispose() {
      this.element.remove();
    }
  };

  // src/lyric-player/dom/interlude-dots.ts
  function easeInOutBack(x) {
    const c1 = 1.70158;
    const c2 = c1 * 1.525;
    return x < 0.5 ? (2 * x) ** 2 * ((c2 + 1) * 2 * x - c2) / 2 : ((2 * x - 2) ** 2 * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2;
  }
  function easeOutExpo(x) {
    return x === 1 ? 1 : 1 - 2 ** (-10 * x);
  }
  var clamp = (min, cur, max) => Math.max(min, Math.min(cur, max));
  var InterludeDots = class {
    element = document.createElement("div");
    dot0 = document.createElement("span");
    dot1 = document.createElement("span");
    dot2 = document.createElement("span");
    left = 0;
    top = 0;
    playing = true;
    scale = 1;
    lastStyle = "";
    currentInterlude;
    currentTime = 0;
    targetBreatheDuration = 1500;
    constructor() {
      this.element.className = lyric_player_default.interludeDots;
      this.element.appendChild(this.dot0);
      this.element.appendChild(this.dot1);
      this.element.appendChild(this.dot2);
    }
    getElement() {
      return this.element;
    }
    setTransform(left = this.left, top = this.top) {
      if (left === this.left && top === this.top) return;
      this.left = left;
      this.top = top;
      this.applyTransform();
    }
    applyTransform() {
      const style = `translate(${this.left.toFixed(2)}px, ${this.top.toFixed(2)}px) scale(${this.scale})`;
      if (this.lastStyle === style) return;
      this.element.style.transform = style;
      this.lastStyle = style;
    }
    setInterlude(interlude) {
      this.currentInterlude = interlude;
      this.currentTime = interlude?.[0] ?? 0;
      if (interlude) {
        this.element.classList.add(lyric_player_default.enabled);
      } else {
        this.element.classList.remove(lyric_player_default.enabled);
      }
    }
    pause() {
      this.playing = false;
      this.element.classList.remove(lyric_player_default.playing);
    }
    resume() {
      this.playing = true;
      this.element.classList.add(lyric_player_default.playing);
    }
    update(delta = 0, mediaTime) {
      if (mediaTime === void 0 && !this.playing) return;
      this.currentTime = mediaTime ?? this.currentTime + delta;
      if (this.currentInterlude) {
        const interludeDuration = this.currentInterlude[1] - this.currentInterlude[0];
        const currentDuration = this.currentTime - this.currentInterlude[0];
        if (currentDuration <= interludeDuration) {
          const breatheDuration = interludeDuration / Math.ceil(interludeDuration / this.targetBreatheDuration);
          let scale = 1;
          let globalOpacity = 1;
          scale *= Math.sin(1.5 * Math.PI - currentDuration / breatheDuration * 2) / 20 + 1;
          if (currentDuration < 2e3) {
            scale *= easeOutExpo(currentDuration / 2e3);
          }
          if (currentDuration < 500) {
            globalOpacity = 0;
          } else if (currentDuration < 1e3) {
            globalOpacity *= (currentDuration - 500) / 500;
          }
          if (interludeDuration - currentDuration < 750) {
            scale *= 1 - easeInOutBack(
              (750 - (interludeDuration - currentDuration)) / 750 / 2
            );
          }
          if (interludeDuration - currentDuration < 375) {
            globalOpacity *= clamp(
              0,
              (interludeDuration - currentDuration) / 375,
              1
            );
          }
          const dotsDuration = Math.max(0, interludeDuration - 750);
          this.scale = Math.max(0, scale) * 0.7;
          const dot0Opacity = clamp(
            0.25,
            currentDuration * 3 / dotsDuration * 0.75,
            1
          );
          const dot1Opacity = clamp(
            0.25,
            (currentDuration - dotsDuration / 3) * 3 / dotsDuration * 0.75,
            1
          );
          const dot2Opacity = clamp(
            0.25,
            (currentDuration - dotsDuration / 3 * 2) * 3 / dotsDuration * 0.75,
            1
          );
          this.dot0.style.opacity = `${clamp(
            0,
            Math.max(0, globalOpacity * dot0Opacity),
            1
          )}`;
          this.dot1.style.opacity = `${clamp(
            0,
            Math.max(0, globalOpacity * dot1Opacity),
            1
          )}`;
          this.dot2.style.opacity = `${clamp(
            0,
            Math.max(0, globalOpacity * dot2Opacity),
            1
          )}`;
        } else {
          this.scale = 0;
          this.dot0.style.opacity = "0";
          this.dot1.style.opacity = "0";
          this.dot2.style.opacity = "0";
        }
        this.applyTransform();
      }
    }
    dispose() {
      this.element.remove();
    }
  };

  // src/lyric-player/base.ts
  var LyricPlayerBase = class extends EventTarget {
    element = document.createElement("div");
    currentTime = 0;
    lyricLinesSize = /* @__PURE__ */ new WeakMap();
    currentLyricLines = [];
    publicSnapshot;
    // protected currentLyricLineObjects: LyricLineBase[] = [];
    processedLines = [];
    lyricLinesIndexes = /* @__PURE__ */ new WeakMap();
    hotLines = /* @__PURE__ */ new Set();
    bufferedLines = /* @__PURE__ */ new Set();
    isNonDynamic = false;
    scrollToIndex = 0;
    visualAlignIndex = 0;
    disableSpring = false;
    interludeDotsSize = [0, 0];
    interludeDots = new InterludeDots();
    bottomLine = new BottomLineEl(this);
    enableBlur = true;
    enableScale = true;
    hidePassedLines = false;
    scrollBoundary = [0, 0];
    currentLyricLineObjects = [];
    isSeeking = false;
    lastCurrentTime = 0;
    alignAnchor = "center";
    alignPosition = 0.35;
    scrollOffset = 0;
    size = [0, 0];
    allowScroll = true;
    isPageVisible = true;
    posXSpringParams = {
      mass: 1,
      damping: 10,
      stiffness: 100
    };
    posYSpringParams = {
      mass: 0.9,
      damping: 15,
      stiffness: 90
    };
    scaleSpringParams = {
      mass: 2,
      damping: 25,
      stiffness: 100
    };
    scaleForBGSpringParams = {
      mass: 1,
      damping: 20,
      stiffness: 50
    };
    onPageShow = () => {
      this.isPageVisible = true;
      this.setCurrentTime(this.currentTime, true);
    };
    onPageHide = () => {
      this.isPageVisible = false;
    };
    scrolledHandler = 0;
    isScrolled = false;
    resizeObserver = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (!width || !height) return;
      this.onResize();
    });
    wordFadeWidth = 0.5;
    constructor() {
      super();
      this.resizeObserver.observe(this.element);
      this.element.classList.add(lyric_player_default.lyricPlayer);
      this.element.appendChild(this.interludeDots.getElement());
      this.element.appendChild(this.bottomLine.getElement());
      window.addEventListener("pageshow", this.onPageShow);
      window.addEventListener("pagehide", this.onPageHide);
      let startScrollY = 0;
      let direction = "none";
      let startTouchPosY = 0;
      let startScrollTime = 0;
      let scrollSpeed = 0;
      let scrollId = Symbol("amll-scroll");
      let lastMoveY = 0;
      let lastDragTime = 0;
      this.element.addEventListener("touchstart", (evt) => {
        if (this.beginBrowse()) {
          evt.preventDefault();
          startScrollY = this.scrollOffset;
          startTouchPosY = evt.touches[0].screenY;
          lastMoveY = startTouchPosY;
          startScrollTime = Date.now();
          scrollSpeed = 0;
        }
      });
      this.element.addEventListener("touchmove", (evt) => {
        if (this.beginBrowse()) {
          evt.preventDefault();
          const touchScreenY = evt.touches[0].screenY;
          const delta = touchScreenY - startTouchPosY;
          const lastDelta = touchScreenY - lastMoveY;
          const targetDirection = lastDelta > 0 ? "down" : lastDelta < 0 ? "up" : "none";
          if (direction !== targetDirection) {
            direction = targetDirection;
            startScrollY = this.scrollOffset;
            startTouchPosY = touchScreenY;
            startScrollTime = Date.now();
          } else {
            this.scrollOffset = startScrollY - delta;
          }
          lastMoveY = touchScreenY;
          lastDragTime = Date.now();
          this.limitScrollOffset();
          this.queueBrowseLayout(true);
        }
      });
      this.element.addEventListener("touchend", (evt) => {
        if (this.beginBrowse()) {
          evt.preventDefault();
          startTouchPosY = 0;
          const curTime = Date.now();
          if (curTime - lastDragTime > 100) return this.endScrollHandler();
          const scrollDuration = curTime - startScrollTime;
          scrollSpeed = (this.scrollOffset - startScrollY) / scrollDuration * 1e3;
          let lt = 0;
          const curScrollId = Symbol("amll-scroll");
          scrollId = curScrollId;
          const onScrollFrame = (dt) => {
            lt ||= dt;
            if (scrollId === curScrollId && this.beginBrowse()) {
              this.scrollOffset += scrollSpeed * (dt - lt) / 1e3;
              scrollSpeed *= 0.99;
              this.limitScrollOffset();
              this.queueBrowseLayout(true);
              if (Math.abs(scrollSpeed) > 1 && !this.scrollBoundary.includes(this.scrollOffset)) {
                requestAnimationFrame(onScrollFrame);
              }
              this.endScrollHandler();
              lt = dt;
            }
          };
          requestAnimationFrame(onScrollFrame);
          this.endScrollHandler();
        }
      });
      this.element.addEventListener("wheel", (evt) => {
        if (this.beginBrowse()) {
          if (evt.deltaMode === evt.DOM_DELTA_PIXEL) {
            this.scrollOffset += evt.deltaY;
            this.limitScrollOffset();
            this.queueBrowseLayout(true);
          } else {
            this.scrollOffset += evt.deltaY * 50;
            this.limitScrollOffset();
            this.queueBrowseLayout(false);
          }
          this.endScrollHandler();
        }
      });
    }
    browseLayout;
    get isManualScrolling() {
      return this.isScrolled;
    }
    queueBrowseLayout(force = true) {
      this.browseLayout = force || !!this.browseLayout;
    }
    beginBrowse() {
      const allowed = this.allowScroll;
      if (allowed) {
        this.isScrolled = true;
        clearTimeout(this.scrolledHandler);
        this.scrolledHandler = setTimeout(() => {
          this.resetScroll();
          this.calcLayout();
        }, 5e3);
      }
      return allowed;
    }
    endScrollHandler() {
    }
    limitScrollOffset() {
      this.scrollOffset = Math.max(
        Math.min(this.scrollBoundary[1], this.scrollOffset),
        this.scrollBoundary[0]
      );
    }
    /**
     * 设置文字动画的渐变宽度，单位以歌词行的主文字字体大小的倍数为单位，默认为 0.5，即一个全角字符的一半宽度
     *
     * 如果要模拟 Apple Music for Android 的效果，可以设置为 1
     *
     * 如果要模拟 Apple Music for iPad 的效果，可以设置为 0.5
     *
     * 如果想要近乎禁用渐变效果，可以设置成非常接近 0 的小数（例如 `0.0001` ），但是**不可以为 0**
     *
     * @param value 需要设置的渐变宽度，单位以歌词行的主文字字体大小的倍数为单位，默认为 0.5
     */
    setWordFadeWidth(value = 0.5) {
      this.wordFadeWidth = Math.max(1e-4, value);
    }
    /**
     * 是否启用歌词行缩放效果，默认启用
     *
     * 如果启用，非选中的歌词行会轻微缩小以凸显当前播放歌词行效果
     *
     * 此效果对性能影响微乎其微，推荐启用
     * @param enable 是否启用歌词行缩放效果
     */
    setEnableScale(enable = true) {
      this.enableScale = enable;
      this.calcLayout();
    }
    /**
     * 获取当前是否启用了歌词行缩放效果
     * @returns 是否启用歌词行缩放效果
     */
    getEnableScale() {
      return this.enableScale;
    }
    /**
     * 获取当前文字动画的渐变宽度，单位以歌词行的主文字字体大小的倍数为单位
     * @returns 当前文字动画的渐变宽度，单位以歌词行的主文字字体大小的倍数为单位
     */
    getWordFadeWidth() {
      return this.wordFadeWidth;
    }
    setIsSeeking(isSeeking) {
      this.isSeeking = isSeeking;
    }
    /**
     * 设置是否隐藏已经播放过的歌词行，默认不隐藏
     * @param hide 是否隐藏已经播放过的歌词行，默认不隐藏
     */
    setHidePassedLines(hide) {
      this.hidePassedLines = hide;
      this.calcLayout();
    }
    /**
     * 设置是否启用歌词行的模糊效果
     * @param enable 是否启用
     */
    setEnableBlur(enable) {
      if (this.enableBlur === enable) return;
      this.enableBlur = enable;
      this.calcLayout();
    }
    /**
     * 设置目标歌词行的对齐方式，默认为 `center`
     *
     * - 设置成 `top` 的话将会向目标歌词行的顶部对齐
     * - 设置成 `bottom` 的话将会向目标歌词行的底部对齐
     * - 设置成 `center` 的话将会向目标歌词行的垂直中心对齐
     * @param alignAnchor 歌词行对齐方式，详情见函数说明
     */
    setAlignAnchor(alignAnchor) {
      this.alignAnchor = alignAnchor;
    }
    /**
     * 设置默认的歌词行对齐位置，相对于整个歌词播放组件的大小位置，默认为 `0.5`
     * @param alignPosition 一个 `[0.0-1.0]` 之间的任意数字，代表组件高度由上到下的比例位置
     */
    setAlignPosition(alignPosition) {
      this.alignPosition = alignPosition;
    }
    /**
     * 设置是否使用物理弹簧算法实现歌词动画效果，默认启用
     *
     * 如果启用，则会通过弹簧算法实时处理歌词位置，但是需要性能足够强劲的电脑方可流畅运行
     *
     * 如果不启用，则会回退到基于 `transition` 的过渡效果，对低性能的机器比较友好，但是效果会比较单一
     */
    setEnableSpring(enable = true) {
      this.disableSpring = !enable;
      if (enable) {
        this.element.classList.remove(lyric_player_default.disableSpring);
      } else {
        this.element.classList.add(lyric_player_default.disableSpring);
      }
      this.calcLayout(true);
    }
    /**
     * 获取当前是否启用了物理弹簧
     * @returns 是否启用物理弹簧
     */
    getEnableSpring() {
      return !this.disableSpring;
    }
    /**
     * 获取当前播放时间里是否处于间奏区间
     * 如果是则会返回单位为毫秒的始末时间
     * 否则返回 undefined
     *
     * 这个只允许内部调用
     * @returns [开始时间,结束时间,大概处于的歌词行ID,下一句是否为对唱歌词] 或 undefined 如果不处于间奏区间
     */
    getCurrentInterlude() {
      if (this.bufferedLines.size > 0) return void 0;
      const time = this.currentTime;
      const nextIndex = this.processedLines.findIndex((line) => !line.isBG && line.startTime > time);
      if (nextIndex < 0) return void 0;
      const next = this.processedLines[nextIndex];
      if (nextIndex === 0) {
        const end = Math.max(0, next.startTime - 250);
        if (time < end) return [0, end, -2, next.isDuet];
        return void 0;
      }
      let start = 0;
      for (let i = 0; i < nextIndex; i++) {
        start = Math.max(start, this.processedLines[i].endTime);
      }
      if (start <= time) return [start, next.startTime, nextIndex - 1, next.isDuet];
      return void 0;
    }
    /**
     * 设置当前播放歌词，要注意传入后这个数组内的信息不得修改，否则会发生错误
     * @param lines 歌词数组
     * @param initialTime 初始时间，默认为 0
     */
    setLyricLines(lines, initialTime = 0) {
      for (const line of lines) {
        for (const word of line.words) {
          word.word = word.word.replace(/\s+/g, " ");
        }
      }
      this.lastCurrentTime = initialTime;
      this.currentTime = initialTime;
      this.currentLyricLines = esm_default(lines);
      this.processedLines = this.currentLyricLines.map((line) => ({ ...line }));
      this.publicSnapshot = void 0;
      this.isNonDynamic = true;
      for (const line of this.processedLines) {
        if (line.words.length > 1 || line.hasWordTiming || line.romanWords?.length) {
          this.isNonDynamic = false;
          break;
        }
      }
      this.processedLines.forEach((line, i, lines2) => {
        const nextLine = lines2[i + 1];
        const lastWord = line.words[line.words.length - 1];
        if (lastWord) {
          if (nextLine) {
            if (nextLine.startTime > line.endTime) {
              line.endTime = Math.min(line.endTime + 1500, nextLine.startTime);
            }
          } else {
            line.endTime = line.endTime + 1500;
          }
        }
      });
      this.processedLines.forEach((line, i, lines2) => {
        if (line.isBG) return;
        const nextLine = lines2[i + 1];
        if (nextLine?.isBG) {
          nextLine.startTime = Math.min(nextLine.startTime, line.startTime);
        }
      });
      let nextLead;
      for (let i = this.processedLines.length - 1; i >= 0; i--) {
        const line = this.processedLines[i];
        if (nextLead) {
          line.tailHandoffTime = nextLead.startTime - line.endTime < 4000
            ? Math.max(line.endTime, nextLead.startTime)
            : line.endTime;
        }
        if (!line.isBG) nextLead = line;
      }
      this.interludeDots.setInterlude(void 0);
      this.hotLines.clear();
      this.bufferedLines.clear();
      this.resetScroll();
    }
    /**
     * 设置当前播放进度，单位为毫秒且**必须是整数**，此时将会更新内部的歌词进度信息
     * 内部会根据调用间隔和播放进度自动决定如何滚动和显示歌词，所以这个的调用频率越快越准确越好
     *
     * 调用完成后，可以每帧调用 `update` 函数来执行歌词动画效果
     * @param time 当前播放进度，单位为毫秒
     */
    setCurrentTime(time, isSeek = false) {
      this.currentTime = time;
      const removedHotIds = /* @__PURE__ */ new Set();
      const removedIds = /* @__PURE__ */ new Set();
      const addedIds = /* @__PURE__ */ new Set();
      for (const lastHotId of this.hotLines) {
        const line = this.processedLines[lastHotId];
        if (line) {
          if (line.isBG) continue;
          const nextLine = this.processedLines[lastHotId + 1];
          if (nextLine?.isBG) {
            const nextMainLine = this.processedLines[lastHotId + 2];
            const startTime = Math.min(line.startTime, nextLine?.startTime);
            const endTime = Math.min(
              Math.max(line.endTime, nextMainLine?.startTime ?? Number.MAX_VALUE),
              Math.max(line.endTime, nextLine?.endTime)
            );
            if (startTime > time || endTime <= time) {
              this.hotLines.delete(lastHotId);
              removedHotIds.add(lastHotId);
              this.hotLines.delete(lastHotId + 1);
              removedHotIds.add(lastHotId + 1);
              if (isSeek) {
                this.currentLyricLineObjects[lastHotId]?.disable();
                this.currentLyricLineObjects[lastHotId + 1]?.disable();
              }
            }
          } else if (line.startTime > time || line.endTime <= time) {
            this.hotLines.delete(lastHotId);
            removedHotIds.add(lastHotId);
            if (isSeek) this.currentLyricLineObjects[lastHotId]?.disable();
          }
        } else {
          this.hotLines.delete(lastHotId);
          removedHotIds.add(lastHotId);
          if (isSeek) this.currentLyricLineObjects[lastHotId]?.disable();
        }
      }
      this.currentLyricLineObjects.forEach((lineObj, id, arr) => {
        const line = lineObj.getLine();
        if (!line.isBG && line.startTime <= time && line.endTime > time) {
          if (!this.hotLines.has(id)) {
            this.hotLines.add(id);
            addedIds.add(id);
            if (isSeek) lineObj.enable();
            if (arr[id + 1]?.getLine()?.isBG) {
              this.hotLines.add(id + 1);
              addedIds.add(id + 1);
              if (isSeek) arr[id + 1].enable();
            }
          }
        }
      });
      for (const v of this.bufferedLines) {
        if (!this.hotLines.has(v)) {
          removedIds.add(v);
          if (isSeek) this.currentLyricLineObjects[v]?.disable();
        }
      }
      if (isSeek) {
        if (this.hotLines.size > 0) {
          this.scrollToIndex = Math.min(...this.hotLines);
        } else {
          const next = this.processedLines.findIndex((line) => !line.isBG && line.startTime >= time);
          const lastMain = this.processedLines.map((line) => !line.isBG).lastIndexOf(true);
          this.scrollToIndex = next >= 0 ? next : Math.max(0, lastMain);
        }
        this.bufferedLines.clear();
        for (const v of this.hotLines) {
          this.bufferedLines.add(v);
        }
        this.calcLayout(true);
      } else if (removedIds.size > 0 || addedIds.size > 0) {
        if (removedIds.size === 0 && addedIds.size > 0) {
          for (const v of addedIds) {
            this.bufferedLines.add(v);
            this.currentLyricLineObjects[v]?.enable();
          }
          this.scrollToIndex = Math.min(...this.bufferedLines);
          this.calcLayout();
        } else if (addedIds.size === 0 && removedIds.size > 0) {
          if (eqSet(removedIds, this.bufferedLines)) {
            for (const v of this.bufferedLines) {
              if (!this.hotLines.has(v)) {
                this.bufferedLines.delete(v);
                this.currentLyricLineObjects[v]?.disable();
              }
            }
            this.calcLayout();
          }
        } else {
          for (const v of addedIds) {
            this.bufferedLines.add(v);
            this.currentLyricLineObjects[v]?.enable();
          }
          for (const v of removedIds) {
            this.bufferedLines.delete(v);
            this.currentLyricLineObjects[v]?.disable();
          }
          if (this.bufferedLines.size > 0)
            this.scrollToIndex = Math.min(...this.bufferedLines);
          this.calcLayout();
        }
      }
      this.lastCurrentTime = time;
    }
    /**
     * 重新布局定位歌词行的位置，调用完成后再逐帧调用 `update`
     * 函数即可让歌词通过动画移动到目标位置。
     *
     * 函数有一个 `force` 参数，用于指定是否强制修改布局，也就是不经过动画直接调整元素位置和大小。
     *
     * 此函数还有一个 `reflow` 参数，用于指定是否需要重新计算布局
     *
     * 因为计算布局必定会导致浏览器重排布局，所以会大幅度影响流畅度和性能，故请只在以下情况下将其​设置为 true：
     *
     * 1. 歌词页面大小发生改变时（这个组件会自行处理）
     * 2. 加载了新的歌词时（不论前后歌词是否完全一样）
     * 3. 用户自行跳转了歌曲播放位置（不论距离远近）
     *
     * @param force 是否不经过动画直接修改布局定位
     * @param reflow 是否进行重新布局（重新计算每行歌词大小）
     */
    measureLineSizes() {
      for (const line of this.currentLyricLineObjects) this.lyricLinesSize.set(line, line.measureSize());
    }
    calcLayout(force, reflow, capture) {
      if (this.size[0] <= 0 || this.size[1] <= 0) return;
      if (reflow) {
        this.measureLineSizes();
        this.interludeDotsSize[0] = this.interludeDots.getElement().clientWidth;
        this.interludeDotsSize[1] = this.interludeDots.getElement().clientHeight;
        this.bottomLine.lineSize = this.bottomLine.measureSize();
      }
      const interlude = this.getCurrentInterlude();
      const offset = capture ? 0 : this.scrollOffset;
      let curPos = -offset;
      let targetAlignIndex = this.scrollToIndex;
      let interludeDuration = 0;
      if (interlude) {
        interludeDuration = interlude[1] - interlude[0];
        if (interludeDuration >= 4e3) {
          const nextLine = this.currentLyricLineObjects[interlude[2] + 1];
          if (nextLine) {
            targetAlignIndex = interlude[2] + 1;
          }
        }
      }
      if (interludeDuration < 4e3) {
        this.interludeDots.setInterlude(void 0);
      }
      this.visualAlignIndex = targetAlignIndex;
      const scrollOffset = this.currentLyricLineObjects.slice(0, targetAlignIndex).reduce(
        (acc, el) => acc + (el.getLine().isBG ? 0 : this.lyricLinesSize.get(el)?.[1] ?? 0),
        0
      );
      this.scrollBoundary[0] = -scrollOffset;
      curPos -= scrollOffset;
      curPos += this.size[1] * this.alignPosition;
      const curLine = this.currentLyricLineObjects[targetAlignIndex];
      if (curLine) {
        const lineHeight = this.lyricLinesSize.get(curLine)?.[1] ?? 0;
        switch (this.alignAnchor) {
          case "bottom":
            curPos -= lineHeight;
            break;
          case "center":
            curPos -= lineHeight / 2;
            break;
          case "top":
            break;
        }
      }
      const latestIndex = Math.max(...this.bufferedLines);
      let delay = 0;
      let baseDelay = 0.05;
      let dotsTop;
      this.currentLyricLineObjects.forEach((lineObj, i) => {
        const hasBuffered = this.bufferedLines.has(i);
        const isActive = hasBuffered || i >= this.scrollToIndex && i < latestIndex;
        const line = lineObj.getLine();
        const plainOriginal = this.isNonDynamic || line.staticOriginal;
        const left = 0;
        if (interludeDuration >= 4e3 && i === (interlude[2] === -2 ? 0 : interlude[2] + 1)) {
          dotsTop = curPos + 10;
          if (!capture) this.interludeDots.setTransform(0, dotsTop);
          this.interludeDots.setInterlude([interlude[0], interlude[1]]);
          curPos += this.interludeDotsSize[1] + 40;
        }
        let targetOpacity;
        if (this.hidePassedLines) {
          if (i < (interlude ? interlude[2] + 1 : this.scrollToIndex)) {
            targetOpacity = 0;
          } else if (hasBuffered) {
            targetOpacity = 0.85;
          } else {
            targetOpacity = plainOriginal ? 0.2 : 1;
          }
        } else {
          if (hasBuffered) {
            targetOpacity = 0.85;
          } else {
            targetOpacity = plainOriginal ? 0.2 : 1;
          }
        }
        let blurLevel = 0;
        if (this.enableBlur) {
          if (isActive) {
            blurLevel = 0;
          } else {
            blurLevel = 1;
            if (i < this.scrollToIndex) {
              blurLevel += Math.abs(this.scrollToIndex - i) + 1;
            } else {
              blurLevel += Math.abs(
                i - Math.max(this.scrollToIndex, latestIndex)
              );
            }
          }
        }
        const SCALE_ASPECT = this.enableScale ? 97 : 100;
        const scale = isActive ? 100 : line.isBG ? 75 : SCALE_ASPECT;
        const height = !line.isBG || isActive ? this.lyricLinesSize.get(lineObj)?.[1] ?? 0 : 0;
        if (capture) capture(i, curPos, height, scale, targetOpacity);
        else lineObj.setTransform(
          left,
          curPos,
          scale,
          targetOpacity,
          window.innerWidth <= 1024 ? blurLevel * 0.8 : blurLevel,
          force,
          delay
        );
        curPos += height;
        if (curPos >= 0 && !this.isSeeking) {
          if (!line.isBG) delay += baseDelay;
          if (i >= this.scrollToIndex) baseDelay /= 1.05;
        }
      });
      this.scrollBoundary[1] = curPos + offset - this.size[1] / 2;
      this.bottomLine.setTransform(0, curPos, force, delay);
      return dotsTop;
    }
    /**
     * 设置所有歌词行在横坐标上的弹簧属性，包括重量、弹力和阻力。
     *
     * @param params 需要设置的弹簧属性，提供的属性将会覆盖原来的属性，未提供的属性将会保持原样
     */
    setLinePosXSpringParams(params = {}) {
      this.posXSpringParams = {
        ...this.posXSpringParams,
        ...params
      };
      this.bottomLine.lineTransforms.posX.updateParams(this.posXSpringParams);
      for (const line of this.currentLyricLineObjects) {
        line.lineTransforms.posX.updateParams(this.posXSpringParams);
      }
    }
    /**
     * 设置所有歌词行在​纵坐标上的弹簧属性，包括重量、弹力和阻力。
     *
     * @param params 需要设置的弹簧属性，提供的属性将会覆盖原来的属性，未提供的属性将会保持原样
     */
    setLinePosYSpringParams(params = {}) {
      this.posYSpringParams = {
        ...this.posYSpringParams,
        ...params
      };
      this.bottomLine.lineTransforms.posY.updateParams(this.posYSpringParams);
      for (const line of this.currentLyricLineObjects) {
        line.lineTransforms.posY.updateParams(this.posYSpringParams);
      }
    }
    /**
     * 设置所有歌词行在​缩放大小上的弹簧属性，包括重量、弹力和阻力。
     *
     * @param params 需要设置的弹簧属性，提供的属性将会覆盖原来的属性，未提供的属性将会保持原样
     */
    setLineScaleSpringParams(params = {}) {
      this.scaleSpringParams = {
        ...this.scaleSpringParams,
        ...params
      };
      this.scaleForBGSpringParams = {
        ...this.scaleForBGSpringParams,
        ...params
      };
      for (const lineObj of this.currentLyricLineObjects) {
        if (lineObj.getLine().isBG) {
          lineObj.lineTransforms.scale.updateParams(this.scaleForBGSpringParams);
        } else {
          lineObj.lineTransforms.scale.updateParams(this.scaleSpringParams);
        }
      }
    }
    /**
     * 暂停部分效果演出，目前会暂停播放间奏点的动画
     */
    pause() {
      this.interludeDots.pause();
    }
    /**
     * 恢复部分效果演出，目前会恢复播放间奏点的动画
     */
    resume() {
      this.interludeDots.resume();
    }
    /**
     * 更新动画，这个函数应该被逐帧调用或者在以下情况下调用一次：
     *
     * 1. 刚刚调用完设置歌词函数的时候
     * @param delta 距离上一次被调用到现在的时长，单位为毫秒（可为浮点数）
     */
    update(delta = 0) {
      if (this.browseLayout !== void 0) {
        const force = this.browseLayout;
        this.browseLayout = void 0;
        this.calcLayout(force);
      }
      this.bottomLine.update(delta / 1e3);
      this.interludeDots.update(0, this.currentTime);
    }
    onResize() {
    }
    /**
     * 获取一个特殊的底栏元素，默认是空白的，可以往内部添加任意元素
     *
     * 这个元素始终在歌词的底部，可以用于显示歌曲创作者等信息
     *
     * 但是请勿删除该元素，只能在内部存放元素
     *
     * @returns 一个元素，可以往内部添加任意元素
     */
    getBottomLineElement() {
      return this.bottomLine.getElement();
    }
    /**
     * 重置用户滚动状态
     *
     * 请在用户完成滚动点击跳转歌词时调用本事件再调用 `calcLayout` 以正确滚动到目标位置
     */
    resetScroll() {
      this.browseLayout = void 0;
      this.isScrolled = false;
      this.scrollOffset = 0;
      clearTimeout(this.scrolledHandler);
      this.scrolledHandler = 0;
    }
    /**
     * 获取当前歌词数组
     *
     * 一般和最后调用 `setLyricLines` 给予的参数一样
     * @returns 当前歌词数组
     */
    getLyricLines() {
      return this.publicSnapshot ??= esm_default(this.currentLyricLines);
    }
    /**
     * 获取当前歌词的播放位置
     *
     * 一般和最后调用 `setCurrentTime` 给予的参数一样
     * @returns 当前播放位置
     */
    getCurrentTime() {
      return this.currentTime;
    }
    getElement() {
      return this.element;
    }
    dispose() {
      this.allowScroll = false;
      this.resetScroll();
      this.resizeObserver.disconnect();
      this.element.remove();
      window.removeEventListener("pageshow", this.onPageShow);
      window.removeEventListener("pagehide", this.onPageHide);
    }
  };
  var LyricLineBase = class extends EventTarget {
    left = 0;
    top = 0;
    scale = 1;
    blur = 0;
    opacity = 1;
    delay = 0;
    lineTransforms = {
      posX: new Spring(0),
      posY: new Spring(0),
      scale: new Spring(100)
    };
    setTransform(left = this.left, top = this.top, scale = this.scale, opacity = this.opacity, blur = this.blur, _force = false, delay = 0) {
      this.left = left;
      this.top = top;
      this.scale = scale;
      this.opacity = opacity;
      this.blur = blur;
      this.delay = delay;
    }
    /**
     * 判定歌词是否可以应用强调辉光效果
     *
     * 果子在对辉光效果的解释是一种强调（emphasized）效果
     *
     * 条件是一个单词时长大于等于 1s 且长度小于等于 7
     *
     * @param word 单词
     * @returns 是否可以应用强调辉光效果
     */
    static shouldEmphasize(word) {
      return word.endTime - word.startTime >= 1e3 && word.word.trim().length <= 7 && word.word.trim().length > 1;
    }
    dispose() {
    }
  };

  // src/lyric-player/dom/lyric-line.ts
  var import_bezier_easing = __toESM(require_src());

  // src/utils/lyric-split-words.ts
  var CJKEXP = /^[\p{Unified_Ideograph}\u0800-\u9FFC]+$/u;
  function chunkAndSplitLyricWords(words) {
    const resplitedWords = [];
    for (const w of words) {
      const realLength = w.word.replace(/\s/g, "").length;
      const splited = w.word.split(" ").filter((v) => v.trim().length > 0);
      if (splited.length > 1) {
        if (w.word.startsWith(" ")) {
          resplitedWords.push({
            word: " ",
            startTime: 0,
            endTime: 0
          });
        }
        let charPos = 0;
        for (const s of splited) {
          const word = {
            word: s,
            startTime: w.startTime + charPos / realLength * (w.endTime - w.startTime),
            endTime: w.startTime + (charPos + s.length) / realLength * (w.endTime - w.startTime)
          };
          resplitedWords.push(word);
          resplitedWords.push({
            word: " ",
            startTime: 0,
            endTime: 0
          });
          charPos += s.length;
        }
        if (!w.word.endsWith(" ")) {
          resplitedWords.pop();
        }
      } else {
        resplitedWords.push({
          ...w
        });
      }
    }
    let wordChunk = [];
    let wChunk = [];
    const result = [];
    for (const w of resplitedWords) {
      const word = w.word;
      wordChunk.push(word);
      wChunk.push(w);
      if (word.length > 0 && word.trim().length === 0) {
        wordChunk.pop();
        wChunk.pop();
        if (wChunk.length === 1) {
          result.push(wChunk[0]);
        } else if (wChunk.length > 1) {
          result.push(wChunk);
        }
        result.push(w);
        wordChunk = [];
        wChunk = [];
      } else if (!/^\s*[^\s]*\s*$/.test(wordChunk.join("")) || CJKEXP.test(word)) {
        wordChunk.pop();
        wChunk.pop();
        if (wChunk.length === 1) {
          result.push(wChunk[0]);
        } else if (wChunk.length > 1) {
          result.push(wChunk);
        }
        wordChunk = [word];
        wChunk = [w];
      }
    }
    if (wChunk.length === 1) {
      result.push(wChunk[0]);
    } else {
      result.push(wChunk);
    }
    return result;
  }

  // src/utils/matrix.ts
  function createMatrix4() {
    return [
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1
    ];
  }
  function scaleMatrix4(m, scale = 1, origin = { x: 0, y: 0 }) {
    const [ox, oy] = [origin.x, origin.y];
    return [
      m[0] * scale,
      m[1] * scale,
      m[2] * scale,
      m[3],
      m[4] * scale,
      m[5] * scale,
      m[6] * scale,
      m[7],
      m[8] * scale,
      m[9] * scale,
      m[10] * scale,
      m[11],
      m[12] - ox * scale + ox,
      m[13] - oy * scale + oy,
      m[14],
      m[15]
    ];
  }
  function matrix4ToCSS(m, fractionDigits = 4) {
    const format = (n, i) => n.toFixed(fractionDigits);
    return `matrix3d(${m.map(format).join(", ")})`;
  }

  // src/lyric-player/dom/lyric-line.ts
  var ANIMATION_FRAME_QUANTITY = 32;
  var norNum = (min, max) => (x) => Math.min(1, Math.max(0, (x - min) / (max - min)));
  var EMP_EASING_MID = 0.5;
  var beginNum = norNum(0, EMP_EASING_MID);
  var endNum = norNum(EMP_EASING_MID, 1);
  var bezIn = (0, import_bezier_easing.default)(0.2, 0.4, 0.58, 1);
  var bezOut = (0, import_bezier_easing.default)(0.3, 0, 0.58, 1);
  var makeEmpEasing = (mid) => {
    return (x) => x < mid ? bezIn(beginNum(x)) : 1 - bezOut(endNum(x));
  };
  function generateFadeGradient(width, padding = 0, bright = "rgba(0,0,0,var(--bright-mask-alpha, 1.0))", dark = "rgba(0,0,0,var(--dark-mask-alpha, 1.0))") {
    const totalAspect = 2 + width + padding;
    const widthInTotal = width / totalAspect;
    const leftPos = (1 - widthInTotal) / 2;
    return [
      `linear-gradient(to right,${bright} ${leftPos * 100}%,${dark} ${(leftPos + widthInTotal) * 100}%)`,
      totalAspect
    ];
  }
  var RawLyricLineMouseEvent = class extends MouseEvent {
    constructor(line, event) {
      super(event.type, event);
      this.line = line;
    }
  };
  function getScaleFromTransform(transform) {
    const match = transform.match(/matrix\(([^)]+)\)/);
    if (match) {
      const values = match[1].split(", ");
      const scaleX = Number.parseFloat(values[0]);
      const scaleY = Number.parseFloat(values[3]);
      return (scaleX + scaleY) / 2;
    }
    return 1;
  }
  var LyricLineEl = class extends LyricLineBase {
    constructor(lyricPlayer, lyricLine = {
      words: [],
      translatedLyric: "",
      romanLyric: "",
      startTime: 0,
      endTime: 0,
      isBG: false,
      isDuet: false
    }) {
      super();
      this.lyricPlayer = lyricPlayer;
      this.lyricLine = lyricLine;
      this._prevParentEl = lyricPlayer.rowLayer;
      this.element.setAttribute("class", lyric_player_default.lyricLine);
      this.element.classList.toggle("anp-background-vocal", !!this.lyricLine.backgroundVocal || this.lyricLine.isBG);
      if (this.lyricLine.isBG) {
        this.element.classList.add(lyric_player_default.lyricBgLine);
      }
      if (this.lyricLine.isDuet) {
        this.element.classList.add(lyric_player_default.lyricDuetLine);
      }
      this.element.appendChild(document.createElement("div"));
      this.element.appendChild(document.createElement("div"));
      this.element.appendChild(document.createElement("div"));
      const main = this.element.children[0];
      const trans = this.element.children[2];
      const roman = this.element.children[1];
      main.setAttribute("class", lyric_player_default.lyricMainLine);
      trans.setAttribute("class", lyric_player_default.lyricSubLine);
      roman.classList.add(lyric_player_default.lyricSubLine, "anp-roman");
      trans.classList.add("anp-translation");
      this.rebuildStyle();
    }
    element = document.createElement("div");
    splittedWords = [];
    romanWords = [];
    readingSpans = [];
    litReadings = 0;
    animatedWords = [];
    // 由 LyricPlayer 来设置
    lineSize = [0, 0];
    listenersMap = /* @__PURE__ */ new Map();
    onMouseEvent = (e) => {
      const wrapped = new RawLyricLineMouseEvent(this, e);
      for (const listener of this.listenersMap.get(e.type) ?? []) {
        listener.call(this, wrapped);
      }
      if (!this.dispatchEvent(wrapped) || wrapped.defaultPrevented) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    };
    addMouseEventListener(type, callback, options) {
      if (callback) {
        const listeners = this.listenersMap.get(type) ?? /* @__PURE__ */ new Set();
        if (listeners.size === 0)
          this.element.addEventListener(type, this.onMouseEvent, options);
        listeners.add(callback);
        this.listenersMap.set(type, listeners);
      }
    }
    removeMouseEventListener(type, callback, options) {
      if (callback) {
        const listeners = this.listenersMap.get(type);
        if (listeners) {
          listeners.delete(callback);
          if (listeners.size === 0)
            this.element.removeEventListener(type, this.onMouseEvent, options);
        }
      }
    }
    areWordsOnSameLine(word1, word2) {
      if (word1?.mainElement && word2?.mainElement) {
        const word1el = word1.mainElement;
        const word2el = word2.mainElement;
        const rect1 = word1el.getBoundingClientRect();
        const rect2 = word2el.getBoundingClientRect();
        const topDifference = Math.abs(rect1.top - rect2.top);
        return topDifference < 10;
      }
      return true;
    }
    isEnabled = false;
    hasContent = false;
    played = false;
    get motionSettled() {
      const { posX, posY, scale } = this.lineTransforms;
      return posX.idle && posY.idle && scale.idle;
    }
    ensureContent() {
      if (!this.hasContent) this.rebuildElement();
    }
    releaseHiddenContent() {
      if (!this.hasContent || this.isEnabled || !this._hide) return;
      this.disposeElements();
      for (const child of this.element.children) child.replaceChildren();
      this.hasContent = this.hasEffects = false;
    }
    hasEffects = false;
    lastMaskProgress = NaN;
    enable(maskAnimationTime = this.lyricLine.startTime) {
      this.lyricPlayer.movingLines.add(this);
      this.isEnabled = true;
      if (this.lyricPlayer.supportWebkitMaskImage && !this.lyricPlayer.supportMaskImage) this.lyricPlayer.clockMasks.add(this);
      if (!this.hasEffects && !this.lyricPlayer._getIsNonDynamic()) {
        this.rebuildElement(true);
        this.markMaskImageDirty();
      }
      this.element.classList.add(lyric_player_default.active);
      const main = this.element.children[0];
      for (const word of this.animatedWords) {
        for (const a of word.elementAnimations) {
          a.currentTime = 0;
          a.playbackRate = 1;
          a.play();
        }
        for (const a of word.maskAnimations) {
          a.currentTime = Math.min(
            this.totalDuration,
            Math.max(0, maskAnimationTime - this.lyricLine.startTime)
          );
          a.playbackRate = 1;
          a.play();
        }
      }
      main.classList.add(lyric_player_default.active);
    }
    disable() {
      const time = this.lyricPlayer.getCurrentTime();
      this.paintClockMasks(time);
      this.syncReadingGroups(time);
      this.lyricPlayer.clockMasks.delete(this);
      this.lyricPlayer.movingLines.add(this);
      this.isEnabled = false;
      this.element.classList.remove(lyric_player_default.active);
      const main = this.element.children[0];
      for (const word of this.animatedWords) {
        for (const a of word.elementAnimations) {
          if (a.id === "anp-tail-glow") {
            a.pause();
            continue;
          }
          if (a.id === "float-word" || a.id.includes("emphasize-word-float-only")) {
            a.playbackRate = -1;
            a.play();
          }
        }
      }
      main.classList.remove(lyric_player_default.active);
      this.releaseHiddenContent();
    }
    lastWord;
    resume() {
      if (!this.isEnabled) return;
      for (const word of this.animatedWords) {
        for (const a of word.elementAnimations) {
          if (!this.lastWord || this.animatedWords.indexOf(this.lastWord) < this.animatedWords.indexOf(word)) {
            a.play();
          }
        }
        for (const a of word.maskAnimations) {
          if (!this.lastWord || this.animatedWords.indexOf(this.lastWord) < this.animatedWords.indexOf(word)) {
            a.play();
          }
        }
      }
    }
    pause() {
      if (!this.isEnabled) return;
      for (const word of this.animatedWords) {
        for (const a of word.elementAnimations) {
          a.pause();
        }
        for (const a of word.maskAnimations) {
          a.pause();
        }
      }
    }
    setMaskAnimationState(maskAnimationTime = 0) {
      const t = maskAnimationTime - this.lyricLine.startTime;
      for (const word of this.animatedWords) {
        for (const a of word.maskAnimations) {
          a.currentTime = Math.min(this.totalDuration, Math.max(0, t));
          a.playbackRate = 1;
          if (t >= 0 && t < this.totalDuration) a.play();
          else a.pause();
        }
      }
    }
    prepareMeasure() {
      this.ensureContent();
      if (!this._hide) return;
      this._prevParentEl?.appendChild(this.element);
      this.element.style.display = "";
      this.element.style.visibility = "hidden";
    }
    readSize() {
      const size = [this.element.clientWidth, this.element.clientHeight];
      this.lineSize = size;
      return size;
    }
    finishMeasure() {
      if (!this._hide) return;
      this.element.remove();
      this.element.style.display = "none";
      this.element.style.visibility = "";
      this.releaseHiddenContent();
    }
    measureSize() {
      this.prepareMeasure();
      try {
        return this.readSize();
      } finally {
        this.finishMeasure();
      }
    }
    getLine() {
      return this.lyricLine;
    }
    _hide = true;
    _prevParentEl = null;
    styleHidden;
    lastX = NaN;
    lastY = NaN;
    lastScale = NaN;
    lastTransform = "";
    lastBlur = NaN;
    lastDelay = "";
    show() {
      this.ensureContent();
      this._hide = false;
      if (this._prevParentEl) {
        this._prevParentEl.appendChild(this.element);
        this._prevParentEl = null;
      }
      this.rebuildStyle();
    }
    hide() {
      this._hide = true;
      if (this.element.parentElement) {
        this._prevParentEl = this.element.parentElement;
        this.element.remove();
      }
      this.rebuildStyle();
    }
    resetUnstartedInk(time) {
      this.syncReadingGroups(time);
      if (this.isEnabled || !this.hasEffects || time >= this.lyricLine.startTime) return;
      if (this._hide) this.releaseHiddenContent();
      else this.rebuildElement();
    }
    updateReadingState(time) {
      const played = time >= this.lyricLine.endTime;
      if (played === this.played) return;
      this.played = played;
      this.element.classList.toggle("anp-played-row", played);
    }
    placeInBrowse(top, scale, opacity) {
      this.updateReadingState(this.lyricPlayer.getCurrentTime());
      this.lineTransforms.posY.setPosition(top);
      this.lineTransforms.scale.setPosition(scale);
      this.setMainOpacity(opacity);
      this.show();
      this.updateMaskAlpha(scale / 100);
    }
    leaveBrowseWindow() {
      this.hide();
      this.releaseHiddenContent();
    }
    refreshBrowseInk() {
      if (!this._hide && this.maskImageDirty) this.updateMaskImage();
    }
    setMainOpacity(opacity) {
      const style = this.element.children[0].style;
      const value = String(opacity);
      if (style.opacity !== value) style.opacity = value;
    }
    rebuildStyle() {
      const style = this.element.style;
      if (this.styleHidden !== this._hide) {
        style.display = this._hide ? "none" : "";
        this.styleHidden = this._hide;
        if (this._hide) {
          style.transform = "translate(0,-10000px)";
          this.lastX = NaN;
          this.lastTransform = "";
        }
      }
      if (this._hide) return;
      const x = this.lineTransforms.posX.getCurrentPosition();
      const y = this.lineTransforms.posY.getCurrentPosition();
      const scale = this.lineTransforms.scale.getCurrentPosition() / 100;
      if (x !== this.lastX || y !== this.lastY || scale !== this.lastScale) {
        this.lastX = x;
        this.lastY = y;
        this.lastScale = scale;
        const transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) scale(" + scale.toFixed(4) + ")";
        if (transform !== this.lastTransform) {
          style.transform = transform;
          this.lastTransform = transform;
        }
      }
      const blur = Math.min(32, this.blur);
      if (blur !== this.lastBlur) {
        style.filter = "blur(" + blur + "px)";
        this.lastBlur = blur;
      }
      const delay = !this.lyricPlayer.getEnableSpring() && this.isInSight ? this.delay + "ms" : "";
      if (delay !== this.lastDelay) {
        style.transitionDelay = delay;
        this.lastDelay = delay;
      }
    }
    rebuildElement(withEffects = false) {
      this.hasContent = true;
      this.disposeElements();
      this.hasEffects = withEffects;
      this.element.classList.toggle("anp-reading-row", !withEffects && !this.lyricPlayer._getIsNonDynamic());
      const main = this.element.children[0];
      const trans = this.element.children[2];
      const roman = this.element.children[1];
      const groups = this.lyricLine.readingGroups;
      main.classList.toggle("anp-grouped-readings", !!groups?.length);
      main.replaceChildren();
      if (groups?.length) {
        roman.replaceChildren();
        roman.classList.remove("anp-roman-timed");
        for (const group of groups) {
          const unit = document.createElement("span");
          const base = document.createElement("span");
          const label = document.createElement("span");
          unit.className = "anp-reading-group";
          base.className = "anp-reading-base";
          label.className = "anp-reading-caption";
          if (group.words) this.buildWords(base, group.words, withEffects);
          else base.textContent = group.text ?? "";
          label.textContent = group.roman;
          unit.append(base, label);
          main.append(unit);
          if (withEffects && group.endTime != null && group.endTime > group.startTime) {
            label.classList.add("anp-reading-sweep");
            this.romanWords.push({
              word: group.roman,
              startTime: group.startTime,
              endTime: group.endTime,
              mainElement: label,
              subElements: [],
              maskAnimations: [],
              elementAnimations: [],
              shouldEmphasize: false,
              width: 0,
              height: 0,
              padding: 0
            });
          } else {
            this.readingSpans.push({ label, startTime: group.startTime });
          }
        }
        this.syncReadingGroups(this.lyricPlayer.getCurrentTime());
      } else {
        this.buildRoman(roman);
        if (this.lyricLine.staticOriginal || this.lyricPlayer._getIsNonDynamic()) main.innerText = this.lyricLine.words.map((word) => word.word).join("");
        else this.buildWords(main, this.lyricLine.words, withEffects);
      }
      trans.innerText = this.lyricLine.translatedLyric;
      if (withEffects) this.attachTailGlow();
      this.animatedWords = this.splittedWords.concat(this.romanWords);
    }
    buildWords(main, words, withEffects) {
      const chunkedWords = chunkAndSplitLyricWords(words);
      // A gap belongs between word boxes in both the reading and active layouts.
      const appendGap = () => {
        if (main.lastChild?.nodeType !== Node.TEXT_NODE) main.append(" ");
      };
      for (const chunk of chunkedWords) {
        if (Array.isArray(chunk)) {
          if (chunk.length === 0) continue;
          const merged = chunk.reduce(
            (a, b) => {
              a.endTime = Math.max(a.endTime, b.endTime);
              a.startTime = Math.min(a.startTime, b.startTime);
              a.word += b.word;
              return a;
            },
            {
              word: "",
              startTime: Number.POSITIVE_INFINITY,
              endTime: Number.NEGATIVE_INFINITY
            }
          );
          const emp = chunk.map((word) => LyricLineBase.shouldEmphasize(word)).reduce((a, b) => a || b, LyricLineBase.shouldEmphasize(merged));
          const wrapperWordEl = document.createElement("span");
          wrapperWordEl.classList.add(lyric_player_default.emphasizeWrapper);
          const characterElements = [];
          for (const word of chunk) {
            const mainWordEl = document.createElement("span");
            if (emp) {
              mainWordEl.classList.add(lyric_player_default.emphasize);
              const charEls = [];
              for (const char of word.word.trim().split("")) {
                const charEl = document.createElement("span");
                charEl.innerText = char;
                charEls.push(charEl);
                characterElements.push(charEl);
                mainWordEl.appendChild(charEl);
              }
              const realWord = {
                ...word,
                mainElement: mainWordEl,
                subElements: charEls,
                elementAnimations: this.hasEffects ? [this.initFloatAnimation(word, mainWordEl)] : [],
                maskAnimations: [],
                width: 0,
                height: 0,
                padding: 0,
                shouldEmphasize: emp
              };
              this.splittedWords.push(realWord);
            } else {
              mainWordEl.classList.add("anp-descender-space");
              mainWordEl.innerText = word.word.trim();
              this.splittedWords.push({
                ...word,
                mainElement: mainWordEl,
                subElements: [],
                elementAnimations: this.hasEffects ? [this.initFloatAnimation(word, mainWordEl)] : [],
                maskAnimations: [],
                width: 0,
                height: 0,
                padding: 0,
                shouldEmphasize: emp
              });
            }
            wrapperWordEl.appendChild(mainWordEl);
          }
          if (emp && withEffects) {
            this.splittedWords[this.splittedWords.length - 1].elementAnimations.push(
              ...this.initEmphasizeAnimation(
                merged,
                characterElements,
                merged.endTime - merged.startTime,
                merged.startTime - this.lyricLine.startTime
              )
            );
          }
          if (merged.word.trimStart() !== merged.word) {
            appendGap();
          }
          main.appendChild(wrapperWordEl);
          if (merged.word.trimEnd() !== merged.word) {
            appendGap();
          }
        } else if (chunk.word.trim().length === 0) {
          appendGap();
        } else {
          const emp = LyricLineBase.shouldEmphasize(chunk);
          const mainWordEl = document.createElement("span");
          const realWord = {
            ...chunk,
            mainElement: mainWordEl,
            subElements: [],
            elementAnimations: this.hasEffects ? [this.initFloatAnimation(chunk, mainWordEl)] : [],
            maskAnimations: [],
            width: 0,
            height: 0,
            padding: 0,
            shouldEmphasize: emp
          };
          if (emp) {
            mainWordEl.classList.add(lyric_player_default.emphasize);
            const charEls = [];
            for (const char of chunk.word.trim().split("")) {
              const charEl = document.createElement("span");
              charEl.innerText = char;
              charEls.push(charEl);
              mainWordEl.appendChild(charEl);
            }
            realWord.subElements = charEls;
            if (withEffects) {
              const duration = Math.abs(realWord.endTime - realWord.startTime);
              realWord.elementAnimations.push(
                ...this.initEmphasizeAnimation(
                  chunk,
                  charEls,
                  duration,
                  realWord.startTime - this.lyricLine.startTime
                )
              );
            }
          } else {
            mainWordEl.innerText = chunk.word.trim();
          }
          if (chunk.word.trimStart() !== chunk.word) {
            appendGap();
          }
          main.appendChild(mainWordEl);
          if (chunk.word.trimEnd() !== chunk.word) {
            appendGap();
          }
          this.splittedWords.push(realWord);
        }
      }
    }
    syncReadingGroups(time) {
      const readings = this.readingSpans;
      while (this.litReadings > 0 && readings[this.litReadings - 1].startTime > time) {
        readings[--this.litReadings].label.classList.remove("anp-reading-lit");
      }
      while (this.litReadings < readings.length && readings[this.litReadings].startTime <= time) {
        readings[this.litReadings++].label.classList.add("anp-reading-lit");
      }
    }
    // Romanization has its own beat boundaries, even when both lines wrap.
    buildRoman(container) {
      container.replaceChildren();
      const timed = this.lyricLine.romanWords || [];
      container.classList.toggle("anp-roman-timed", timed.length > 0);
      if (!timed.length) {
        container.textContent = this.lyricLine.romanLyric;
        return;
      }
      for (const part of timed) {
        const el = document.createElement("span");
        const text = part.word.trim();
        if (/^\s/.test(part.word)) container.append(" ");
        if (text) {
          el.textContent = text;
          container.append(el);
          this.romanWords.push({
            ...part,
            mainElement: el,
            subElements: [],
            maskAnimations: [],
            elementAnimations: this.hasEffects ? [this.initFloatAnimation(part, el)] : [],
            shouldEmphasize: false,
            width: 0,
            height: 0,
            padding: 0
          });
        }
        if (text && /\s$/.test(part.word)) container.append(" ");
      }
    }
    attachTailGlow() {
      if (!this.lyricLine.hasWordTiming) return;
      const word = [...this.splittedWords].reverse().find((w) => /[\p{L}\p{N}]/u.test(w.word));
      if (!word) return;
      const duration = word.endTime - word.startTime;
      if (duration < 380) return;
      const wordDuration = Math.max(0, duration);
      const handoff = this.lyricLine.tailHandoffTime ?? this.lyricLine.endTime;
      const tailGap = Math.max(0, handoff - word.endTime);
      const delay = word.startTime - this.lyricLine.startTime;
      const totalDuration = wordDuration + tailGap + 250;
      word.tailGlowRestTime = delay + wordDuration + tailGap;
      const walker = document.createTreeWalker(word.mainElement, NodeFilter.SHOW_TEXT);
      let last;
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (/[\p{L}\p{N}]/u.test(node.textContent || "")) last = node;
      }
      const match = last?.data.match(new RegExp("([\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Hangul}ー]\\p{M}*)[\\p{P}\\s]*$", "u"));
      if (!last || !match || match.index === void 0) return;
      const glyph = last.splitText(match.index);
      glyph.splitText(match[1].length);
      const ink = document.createElement("span");
      ink.className = "anp-tail-ink";
      glyph.replaceWith(ink);
      ink.append(glyph);
      // A grouped word can store this tail's old emphasis on another segment.
      for (const part of this.splittedWords) {
        part.elementAnimations = part.elementAnimations.filter((effect) => {
          if (!word.mainElement.contains(effect.effect.target)) return true;
          effect.cancel();
          return false;
        });
      }
      word.elementAnimations.push(this.initFloatAnimation(word, ink, 0.045));
      const isLightTail = wordDuration < 650;
      const strength = isLightTail ? 0.5 * Math.min(1, wordDuration / 650) : Math.min(1, wordDuration / 1e3);
      word.tailFeather = (isLightTail ? 0.15 : 0.22) * strength;
      const decoration = "var(--anp-word-decoration, 0 0 transparent)";
      const off = "0 0 0em transparent, 0 0 0em transparent, " + decoration;
      const shadow = (alpha) => `0 0 .075em rgba(255,255,255,${0.72 * alpha}), 0 0 .20em rgba(255,255,255,${0.54 * alpha}), ${decoration}`;
      const peak = shadow(strength);
      const tPeak = wordDuration * 0.35 / totalDuration;
      const tHold = wordDuration / totalDuration;
      const animation = ink.animate([
        { textShadow: off, offset: 0, easing: "ease-out" },
        { textShadow: peak, offset: tPeak },
        { textShadow: peak, offset: tHold, easing: "ease-out" },
        ...(tailGap > 0 ? [{
          textShadow: shadow(strength * 0.12),
          offset: (wordDuration + tailGap) / totalDuration,
          easing: "ease-out"
        }] : []),
        { textShadow: off, offset: 1 }
      ], {
        id: "anp-tail-glow",
        duration: totalDuration,
        delay,
        fill: "both",
        easing: "linear"
      });
      animation.pause();
      word.elementAnimations.push(animation);
    }
    initFloatAnimation(word, wordEl, up = this.lyricLine.isBG ? 0.1 : 0.05) {
      const delay = word.startTime - this.lyricLine.startTime;
      const duration = Math.max(1e3, word.endTime - word.startTime);
      const a = wordEl.animate(
        [
          {
            transform: "translateY(0px)"
          },
          {
            transform: `translateY(${-up}em)`
          }
        ],
        {
          duration: Number.isFinite(duration) ? duration : 0,
          delay: Number.isFinite(delay) ? delay : 0,
          id: "float-word",
          composite: "add",
          fill: "both",
          easing: "ease-out"
        }
      );
      a.pause();
      return a;
    }
    // 按照原 Apple Music 参考，强调效果只应用缩放、轻微左右位移和辉光效果，原主要的悬浮位移效果不变
    // 为了避免产生锯齿抖动感，使用 matrix3d 来实现缩放和位移
    initEmphasizeAnimation(word, characterElements, duration, delay) {
      const de = Math.max(0, delay);
      let du = Math.max(1e3, duration);
      let result = [];
      let amount = du / 2e3;
      amount = amount > 1 ? Math.sqrt(amount) : amount ** 3;
      let blur = du / 3e3;
      blur = blur > 1 ? Math.sqrt(blur) : blur ** 3;
      amount *= 0.6;
      blur *= 0.5;
      if (this.lyricLine.words.length > 0 && word.word.includes(
        this.lyricLine.words[this.lyricLine.words.length - 1].word
      )) {
        amount *= 1.6;
        blur *= 1.5;
        du *= 1.2;
      }
      amount = Math.min(1.2, amount);
      blur = Math.min(0.8, blur);
      const animateDu = Number.isFinite(du) ? du : 0;
      const empEasing = makeEmpEasing(EMP_EASING_MID);
      const steadyLift = this.steadyVocalLift;
      result = characterElements.flatMap((el, i, arr) => {
        const wordDe = de + du / 2.5 / arr.length * i;
        const result2 = [];
        const frames = new Array(ANIMATION_FRAME_QUANTITY).fill(0).map((_, j) => {
          const x = (j + 1) / ANIMATION_FRAME_QUANTITY;
          const transX = empEasing(x);
          const glowLevel = empEasing(x) * blur;
          const mat = scaleMatrix4(createMatrix4(), 1 + transX * 0.1 * amount);
          const offsetX = -transX * 0.03 * amount * (arr.length / 2 - i);
          const offsetY = steadyLift ? 0 : -transX * 0.025 * amount;
          return {
            offset: x,
            transform: `${matrix4ToCSS(
              mat,
              4
            )} translate(${offsetX}em, ${offsetY}em)`,
            textShadow: `0 0 ${Math.min(
              0.3,
              blur * 0.3
            )}em rgba(255, 255, 255, ${glowLevel}), var(--anp-word-decoration, 0 0 transparent)`
          };
        });
        const glow = el.animate(frames, {
          duration: animateDu,
          delay: Number.isFinite(wordDe) ? wordDe : 0,
          id: `emphasize-word-${el.innerText}-${i}`,
          iterations: 1,
          composite: "replace",
          fill: "both"
        });
        glow.onfinish = () => {
          glow.pause();
        };
        glow.pause();
        result2.push(glow);
        if (steadyLift) {
          const startTime = this.lyricLine.startTime + wordDe - 400;
          result2.push(this.initFloatAnimation(
            { ...word, startTime, endTime: startTime + animateDu * 0.7 },
            el
          ));
          return result2;
        }
        const floatFrame = new Array(ANIMATION_FRAME_QUANTITY).fill(0).map((_, j) => {
          const x = (j + 1) / ANIMATION_FRAME_QUANTITY;
          let y = Math.sin(x * Math.PI);
          if (this.lyricLine.isBG) {
            y *= 2;
          }
          return {
            offset: x,
            transform: `translateY(${-y * 0.05}em)`
          };
        });
        const float = el.animate(floatFrame, {
          duration: animateDu * 1.4,
          delay: Number.isFinite(wordDe) ? wordDe - 400 : 0,
          id: "emphasize-word-float",
          iterations: 1,
          composite: "add",
          fill: "both"
        });
        float.onfinish = () => {
          float.pause();
        };
        float.pause();
        result2.push(float);
        return result2;
      });
      return result;
    }
    get steadyVocalLift() {
      const { isDuet, isBG, backgroundVocal, hasWordTiming, words } = this.lyricLine;
      return isDuet || isBG || backgroundVocal || (!hasWordTiming && words.length === 1);
    }
    get totalDuration() {
      return this.lyricLine.endTime - this.lyricLine.startTime;
    }
    maskImageDirty = false;
    markMaskImageDirty() {
      this.lyricPlayer.movingLines.add(this);
      this.maskImageDirty = this.hasEffects;
    }
    updateMaskImage() {
      this.maskImageDirty = false;
      for (const word of this.animatedWords) {
        const el = word.mainElement;
        const style = getComputedStyle(el);
        word.padding = parseFloat(style.paddingLeft) || 0;
        word.width = el.clientWidth - 2 * word.padding;
        // The extra bottom padding is paint space, so it must not widen the horizontal feather.
        let height = el.clientHeight;
        if (el.classList.contains("anp-descender-space")) {
          const boxHeight = parseFloat(style.height);
          const inset = style.boxSizing === "border-box" ? parseFloat(style.paddingBottom) || 0 : 0;
          if (Number.isFinite(boxHeight)) height = Math.round(boxHeight - inset);
        }
        word.height = height - 2 * word.padding;
      }
      if (this.lyricPlayer.supportMaskImage || this.lyricPlayer.supportWebkitMaskImage) {
        this.generateWebAnimationBasedMaskImage(this.splittedWords);
        if (this.lyricLine.readingGroups?.length) {
          for (const caption of this.romanWords) this.generateWebAnimationBasedMaskImage([caption]);
        } else {
          this.generateWebAnimationBasedMaskImage(this.romanWords);
        }
      } else {
        this.generateCalcBasedMaskImage();
      }
      if (this.isEnabled) {
        this.setMaskAnimationState(this.lyricPlayer.getCurrentTime());
        this.paintClockMasks(this.lyricPlayer.getCurrentTime());
      }
    }
    generateCalcBasedMaskImage() {
      for (const word of this.animatedWords) {
        const wordEl = word.mainElement;
        if (wordEl) {
          word.width = wordEl.clientWidth;
          word.height += 2 * word.padding;
          const fadeWidth = word.height * (this.lyricPlayer.getWordFadeWidth() + (word.tailFeather || 0));
          const [maskImage, totalAspect] = generateFadeGradient(
            fadeWidth / word.width
          );
          const totalAspectStr = `${totalAspect * 100}% 100%`;
          if (this.lyricPlayer.supportMaskImage) {
            wordEl.style.maskImage = maskImage;
            wordEl.style.maskRepeat = "no-repeat";
            wordEl.style.maskOrigin = "left";
            wordEl.style.maskSize = totalAspectStr;
          } else {
            wordEl.style.webkitMaskImage = maskImage;
            wordEl.style.webkitMaskRepeat = "no-repeat";
            wordEl.style.webkitMaskOrigin = "left";
            wordEl.style.webkitMaskSize = totalAspectStr;
          }
          const w = word.width + fadeWidth;
          const maskPos = `clamp(${-w}px,calc(${-w}px + (var(--amll-player-time) - ${word.startTime})*${w / Math.abs(word.endTime - word.startTime)}px),0px) 0px, left top`;
          wordEl.style.maskPosition = maskPos;
          wordEl.style.webkitMaskPosition = maskPos;
        }
      }
    }
    // CEF 91 animates registered custom properties on the style engine. Only
    // write a prefixed mask position when its actual gradient edge changes.
    paintClockMasks(time) {
      if (this._hide) return;
      const elapsed = time - this.lyricLine.startTime;
      for (const word of this.animatedWords) {
        const mask = word.clockMask;
        if (!mask) continue;
        const { times, pixels } = mask;
        let i = mask.index;
        while (i > 0 && elapsed < times[i]) i--;
        while (i + 1 < times.length && elapsed >= times[i + 1]) i++;
        mask.index = i;
        let x = pixels[i];
        if (elapsed > times[i] && i + 1 < times.length) {
          x += (pixels[i + 1] - x) * (elapsed - times[i]) / (times[i + 1] - times[i]);
        }
        const pixel = Math.round(x * 1e3) / 1e3;
        if (pixel !== mask.last) {
          mask.last = pixel;
          word.mainElement.style.webkitMaskPosition = pixel + "px 0px";
        }
      }
    }
    generateWebAnimationBasedMaskImage(track) {
      const totalFadeDuration = Math.max(
        track.reduce((pv, w) => Math.max(w.endTime, pv), 0),
        this.lyricLine.endTime
      ) - this.lyricLine.startTime;
      let precedingWidth = 0;
      track.forEach((word, i) => {
        const prefixWidth = precedingWidth;
        precedingWidth += word.width;
        const wordEl = word.mainElement;
        if (wordEl && word.width > 0 && word.height > 0) {
          const fadeWidth = word.height * (this.lyricPlayer.getWordFadeWidth() + (word.tailFeather || 0));
          const [maskImage, totalAspect] = generateFadeGradient(
            fadeWidth / (word.width + word.padding * 2)
          );
          const totalAspectStr = `${totalAspect * 100}% 100%`;
          if (this.lyricPlayer.supportMaskImage) {
            wordEl.style.maskImage = maskImage;
            wordEl.style.maskRepeat = "no-repeat";
            wordEl.style.maskOrigin = "left";
            wordEl.style.maskSize = totalAspectStr;
          } else {
            wordEl.style.webkitMaskImage = maskImage;
            wordEl.style.webkitMaskRepeat = "no-repeat";
            wordEl.style.webkitMaskOrigin = "left";
            wordEl.style.webkitMaskSize = totalAspectStr;
          }
          const widthBeforeSelf = prefixWidth + (track[0] ? fadeWidth : 0);
          const minOffset = -(word.width + word.padding * 2 + fadeWidth);
          const clampOffset = (x) => Math.max(minOffset, Math.min(0, x));
          let curPos = -widthBeforeSelf - word.width - word.padding - fadeWidth;
          let timeOffset = 0;
          const frames = [];
          const nativeMask = this.lyricPlayer.supportMaskImage;
          const maskPosition = nativeMask ? "maskPosition" : "--anp-extspotify-mask-x";
          let lastPos = curPos;
          let lastTime = 0;
          const pushFrame = () => {
            const moveOffset = curPos - lastPos;
            const time = Math.max(0, Math.min(1, timeOffset));
            const duration = time - lastTime;
            const d = Math.abs(duration / moveOffset);
            if (curPos > minOffset && lastPos < minOffset) {
              const staticTime = Math.abs(lastPos - minOffset) * d;
              const value2 = `${clampOffset(lastPos)}px 0`;
              const frame2 = {
                offset: lastTime + staticTime,
                [maskPosition]: nativeMask ? value2 : value2.split(" ")[0]
              };
              frames.push(frame2);
            }
            if (curPos > 0 && lastPos < 0) {
              const staticTime = Math.abs(lastPos) * d;
              const value2 = `${clampOffset(curPos)}px 0`;
              const frame2 = {
                offset: lastTime + staticTime,
                [maskPosition]: nativeMask ? value2 : value2.split(" ")[0]
              };
              frames.push(frame2);
            }
            const value = `${clampOffset(curPos)}px 0`;
            const frame = {
              offset: time,
              [maskPosition]: nativeMask ? value : value.split(" ")[0]
            };
            frames.push(frame);
            lastPos = curPos;
            lastTime = time;
          };
          pushFrame();
          let lastTimeStamp = 0;
          track.forEach((otherWord, j) => {
            {
              const curTimeStamp = otherWord.startTime - this.lyricLine.startTime;
              const staticDuration = curTimeStamp - lastTimeStamp;
              timeOffset += staticDuration / totalFadeDuration;
              if (staticDuration > 0) pushFrame();
              lastTimeStamp = curTimeStamp;
            }
            {
              const fadeDuration = otherWord.endTime - otherWord.startTime;
              timeOffset += fadeDuration / totalFadeDuration;
              curPos += otherWord.width;
              if (j === 0) {
                curPos += fadeWidth * 1.5;
              }
              if (j === track.length - 1) {
                curPos += fadeWidth * 0.5 + (word.tailFeather ? fadeWidth * 0.5 : 0);
              }
              if (fadeDuration > 0) pushFrame();
              lastTimeStamp += fadeDuration;
            }
          });
          for (const a of word.maskAnimations) {
            a.cancel();
          }
          if (!nativeMask && frames.length && totalFadeDuration > 0 && frames.every((f, k) => Number.isFinite(f.offset) && (!k || Number(f.offset) >= Number(frames[k - 1].offset)))) {
            const times = [], pixels = [];
            for (const frame of frames) {
              const x = parseFloat(String(frame[maskPosition]));
              const ms = Number(frame.offset) * totalFadeDuration, n = pixels.length;
              if (n >= 2 && x === pixels[n - 1] && x === pixels[n - 2]) times[n - 1] = ms;
              else {
                times.push(ms);
                pixels.push(x);
              }
            }
            if (times[times.length - 1] < totalFadeDuration) {
              times.push(totalFadeDuration);
              pixels.push(0);
            }
            word.clockMask = { times, pixels, index: 0, last: NaN };
            word.maskAnimations = [];
            return;
          }
          if (!nativeMask) wordEl.style.webkitMaskPosition = "var(--anp-extspotify-mask-x) 0px";
          try {
            let first = 0, last = frames.length - 1;
            while (first + 1 < last && frames[first][maskPosition] === frames[first + 1][maskPosition]) first++;
            const explicitEnd = frames[last].offset === 1;
            while (explicitEnd && last > first + 1 && frames[last][maskPosition] === frames[last - 1][maskPosition]) last--;
            const start = Number(frames[first].offset);
            const end = explicitEnd ? Number(frames[last].offset) : 1;
            const span = end - start;
            const compact = span > 0 ? frames.slice(first, last + 1) : frames;
            if (span > 0) {
              for (const frame of compact) frame.offset = (Number(frame.offset) - start) / span;
            }
            const ani = wordEl.animate(compact, {
              delay: span > 0 ? start * totalFadeDuration : 0,
              duration: (span > 0 ? span : 1) * totalFadeDuration || 1,
              id: `fade-word-${word.word}-${i}`,
              fill: "both"
            });
            ani.pause();
            word.maskAnimations = [ani];
          } catch (err) {
            console.warn("应用渐变动画发生错误", frames, totalFadeDuration, err);
          }
        }
      });
    }
    getElement() {
      return this.element;
    }
    setTransform(left = this.left, top = this.top, scale = this.scale, opacity = 1, blur = 0, force = false, delay = 0) {
      this.lyricPlayer.movingLines.add(this);
      super.setTransform(left, top, scale, opacity, blur, force, delay);
      const beforeInSight = this.isInSight;
      const enableSpring = this.lyricPlayer.getEnableSpring();
      this.left = left;
      this.top = top;
      this.scale = scale;
      this.delay = delay * 1e3 | 0;
      this.setMainOpacity(opacity);
      if (force || !enableSpring) {
        this.blur = Math.min(32, blur);
        const disableTransition = force && !this.lyricPlayer.isManualScrolling && !this._hide;
        if (disableTransition) this.element.classList.add(lyric_player_default.tmpDisableTransition);
        this.lineTransforms.posX.setPosition(left);
        this.lineTransforms.posY.setPosition(top);
        this.lineTransforms.scale.setPosition(scale);
        if (!enableSpring) {
          const afterInSight = this.isInSight;
          if (beforeInSight || afterInSight) {
            this.show();
          } else {
            this.hide();
          }
        } else this.rebuildStyle();
        if (disableTransition)
          requestAnimationFrame(() => {
            this.element.classList.remove(lyric_player_default.tmpDisableTransition);
          });
      } else {
        this.lineTransforms.posX.setTargetPosition(left, delay);
        this.lineTransforms.posY.setTargetPosition(top, delay);
        this.lineTransforms.scale.setTargetPosition(scale);
      }
    }
    update(delta = 0) {
      if (this.lyricPlayer.getEnableSpring()) {
        this.lineTransforms.posX.update(delta);
        this.lineTransforms.posY.update(delta);
        this.lineTransforms.scale.update(delta);
      }
      if (this.isInSight) {
        this.show();
        if (this.maskImageDirty) {
          this.updateMaskImage();
        }
      } else {
        this.hide();
      }
      if (this._hide) {
        this.releaseHiddenContent();
        return;
      }
      const scale = this.lyricPlayer.getEnableSpring() ? this.lineTransforms.scale.getCurrentPosition() / 100 : getScaleFromTransform(getComputedStyle(this.element).transform);
      this.updateMaskAlpha(scale);
    }
    updateMaskAlpha(scale) {
      const progress = Math.max(0, Math.min(1, (scale - 0.97) / 0.03));
      if (progress === this.lastMaskProgress) return;
      this.lastMaskProgress = progress;
      this.element.style.setProperty("--bright-mask-alpha", String(0.2 + progress * 0.8));
      this.element.style.setProperty("--dark-mask-alpha", String(0.2 + progress * 0.2));
    }
    _getDebugTargetPos() {
      return `[位移: ${this.left}, ${this.top}; 缩放: ${this.scale}; 延时: ${this.delay}]`;
    }
    get isInSight() {
      const l = this.lineTransforms.posX.getCurrentPosition();
      const t = this.lineTransforms.posY.getCurrentPosition();
      const w = this.lineSize[0];
      const h = this.lineSize[1];
      const r = l + w;
      const b = t + h;
      const pr = this.lyricPlayer.size[0];
      const pb = this.lyricPlayer.size[1];
      return !(l > pr + w || r < -w || t > pb + h || b < -h);
    }
    disposeElements() {
      for (const realWord of this.animatedWords) {
        for (const a of realWord.elementAnimations) {
          a.cancel();
        }
        for (const a of realWord.maskAnimations) {
          a.cancel();
        }
        for (const sub of realWord.subElements) {
          sub.remove();
          sub.parentNode?.removeChild(sub);
        }
        realWord.elementAnimations = [];
        realWord.maskAnimations = [];
        realWord.subElements = [];
        realWord.mainElement.remove();
        realWord.mainElement.parentNode?.removeChild(realWord.mainElement);
      }
      this.splittedWords = [];
      this.romanWords = [];
      this.readingSpans = [];
      this.litReadings = 0;
      this.animatedWords = [];
    }
    dispose() {
      this.lyricPlayer.clockMasks.delete(this);
      this.isEnabled = false;
      this._prevParentEl = null;
      this.disposeElements();
      this.element.remove();
    }
  };

  // src/lyric-player/dom/index.ts
  var LyricLineMouseEvent = class extends MouseEvent {
    constructor(lineIndex, line, event) {
      super(`line-${event.type}`, event);
      this.lineIndex = lineIndex;
      this.line = line;
    }
  };
  var DomLyricPlayer = class extends LyricPlayerBase {
    currentLyricLineObjects = [];
    rowLayer = document.createElement("div");
    browseColumn;
    timingEdges = [];
    nextEdge = -Infinity;
    clockMasks = /* @__PURE__ */ new Set();
    movingLines = /* @__PURE__ */ new Set();
    measureLineSizes() {
      const rows = this.currentLyricLineObjects;
      for (let i = 0; i < rows.length; i += 24) {
        const batch = rows.slice(i, i + 24);
        try {
          for (const line of batch) line.prepareMeasure();
          for (const line of batch) this.lyricLinesSize.set(line, line.readSize());
        } finally {
          for (const line of batch) line.finishMeasure();
        }
      }
    }
    beginBrowse() {
      if (!this.currentLyricLineObjects.length || !super.beginBrowse()) return false;
      if (!this.browseColumn) {
        this.browseColumn = new BrowseColumn(this.rowLayer, this.interludeDots, this.scrollOffset);
        this.nextEdge = -Infinity;
        this.calcLayout();
      }
      return true;
    }
    queueBrowseLayout(force = true) {
      if (!this.browseColumn) super.queueBrowseLayout(force);
    }
    setBrowseOffset(offset) {
      if (!this.beginBrowse()) return;
      this.scrollOffset = offset;
      this.limitScrollOffset();
    }
    revealLine(line) {
      if (!this.beginBrowse()) return;
      const column = this.browseColumn;
      column.move(this.scrollOffset, this.size[1]);
      const index = this.lyricLinesIndexes.get(line);
      if (index === void 0) return;
      this.scrollOffset += column.screenTop(index) + line.lineSize[1] / 2 - this.size[1] * this.alignPosition;
      this.limitScrollOffset();
      column.move(this.scrollOffset, this.size[1]);
    }
    resetScroll() {
      this.browseColumn?.finish();
      this.browseColumn = void 0;
      super.resetScroll();
    }
    calcLayout(force, reflow) {
      const column = this.browseColumn;
      if (!column) return super.calcLayout(force, reflow);
      if (!this.size[0] || !this.size[1]) return;
      const center = this.size[1] * this.alignPosition;
      const pendingDelta = this.scrollOffset - column.presentedOffset;
      let anchor = column.anchor(center);
      if (!anchor) {
        let nearest = Infinity;
        for (const line of this.currentLyricLineObjects) {
          if (line.getLine().isBG || line.getElement().parentElement !== this.rowLayer) continue;
          const y = line.lineTransforms.posY.getCurrentPosition();
          const distance = Math.abs(y + line.lineSize[1] / 2 - center);
          if (distance < nearest) {
            nearest = distance;
            anchor = { line, y };
          }
        }
      }
      const rows = [];
      const dotsTop = super.calcLayout(true, reflow, (index, top, height, scale, opacity) => {
        const line = this.currentLyricLineObjects[index];
        rows.push({ line, top, height, scale, opacity });
        if (anchor?.line === line) this.scrollOffset = top - anchor.y;
      });
      column.setRows(rows, this.scrollOffset, dotsTop);
      if (anchor) this.scrollOffset += pendingDelta;
      this.limitScrollOffset();
    }
    setCurrentTime(time, seek = false) {
      if (!seek && this.currentTime <= time && time < this.nextEdge) {
        this.lastCurrentTime = this.currentTime = time;
        return;
      }
      const rewound = time < this.currentTime;
      super.setCurrentTime(time, seek);
      if (rewound) {
        for (const line of this.currentLyricLineObjects) line.resetUnstartedInk(time);
      }
      this.browseColumn?.updateReadingState(time);
      const next = firstIndex(this.timingEdges.length, (i) => this.timingEdges[i] > time);
      this.nextEdge = this.timingEdges[next] ?? Infinity;
    }
    onResize() {
      const width = this.element.clientWidth, height = this.element.clientHeight;
      if (!width || !height) return;
      const styles = getComputedStyle(this.element);
      this._baseFontSize = Number.parseFloat(styles.fontSize);
      this.size[0] = this.innerSize[0] = width - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
      this.size[1] = this.innerSize[1] = height - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom);
      this.rebuildStyle();
      this.calcLayout(true, true);
      for (const line of this.currentLyricLineObjects) line.markMaskImageDirty();
    }
    supportPlusLighter = CSS.supports("mix-blend-mode", "plus-lighter");
    supportMaskImage = CSS.supports("mask-image", "none");
    supportWebkitMaskImage = CSS.supports("-webkit-mask-image", "none");
    innerSize = [0, 0];
    onLineClickedHandler = (e) => {
      const evt = new LyricLineMouseEvent(
        this.lyricLinesIndexes.get(e.line) ?? -1,
        e.line,
        e
      );
      if (!this.dispatchEvent(evt)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };
    /**
     * 是否为非逐词歌词
     * @internal
     */
    _getIsNonDynamic() {
      return this.isNonDynamic;
    }
    _baseFontSize = Number.parseFloat(
      getComputedStyle(this.element).fontSize
    );
    get baseFontSize() {
      return this._baseFontSize;
    }
    constructor() {
      super();
      this.rowLayer.className = "anp-lyric-column";
      this.rowLayer.append(this.interludeDots.getElement(), this.bottomLine.getElement());
      this.element.append(this.rowLayer);
      this.onResize();
      this.element.classList.add("amll-lyric-player", "apple-now-playing-extspotify", "dom");
      if (this.disableSpring) {
        this.element.classList.add(lyric_player_default.disableSpring);
      }
    }
    rebuildStyle() {
      const width = this.innerSize[0];
      const height = this.innerSize[1];
      this.element.style.setProperty("--amll-lp-width", `${width.toFixed(4)}px`);
      this.element.style.setProperty(
        "--amll-lp-height",
        `${height.toFixed(4)}px`
      );
    }
    setWordFadeWidth(value = 0.5) {
      super.setWordFadeWidth(value);
      for (const el of this.currentLyricLineObjects) {
        el.markMaskImageDirty();
      }
    }
    /**
     * 设置当前播放歌词，要注意传入后这个数组内的信息不得修改，否则会发生错误
     * @param lines 歌词数组
     * @param initialTime 初始时间，默认为 0
     */
    setLyricLines(lines, initialTime = 0) {
      super.setLyricLines(lines, initialTime);
      this.movingLines.clear();
      this.clockMasks.clear();
      this.nextEdge = -Infinity;
      this.timingEdges = this.processedLines.flatMap((line) => [line.startTime, line.endTime]).sort((a, b) => a - b);
      for (const line of this.currentLyricLineObjects) {
        line.removeMouseEventListener("click", this.onLineClickedHandler);
        line.removeMouseEventListener("contextmenu", this.onLineClickedHandler);
        line.dispose();
      }
      this.currentLyricLineObjects = this.processedLines.map((line, i) => {
        const lineEl = new LyricLineEl(this, line);
        lineEl.addMouseEventListener("click", this.onLineClickedHandler);
        lineEl.addMouseEventListener("contextmenu", this.onLineClickedHandler);
        this.lyricLinesIndexes.set(lineEl, i);
        lineEl.markMaskImageDirty();
        return lineEl;
      });
      this.setLinePosXSpringParams({});
      this.setLinePosYSpringParams({});
      this.setLineScaleSpringParams({});
      this.setCurrentTime(initialTime, true);
      this.calcLayout(true, true);
    }
    pause() {
      super.pause();
      this.interludeDots.pause();
      for (const line of this.currentLyricLineObjects) {
        line.pause();
      }
    }
    resume() {
      super.resume();
      this.interludeDots.resume();
      for (const line of this.currentLyricLineObjects) {
        line.resume();
      }
    }
    update(delta = 0) {
      if (this.browseColumn) {
        if (!this.isPageVisible) return;
        this.browseColumn.move(this.scrollOffset, this.size[1]);
        for (const i of this.hotLines) this.currentLyricLineObjects[i]?.refreshBrowseInk();
        this.interludeDots.update(0, this.currentTime);
        for (const line of this.clockMasks) line.paintClockMasks(this.currentTime);
        return;
      }
      super.update(delta);
      if (!this.isPageVisible) return;
      const deltaS = delta / 1e3;
      this.bottomLine.update(deltaS);
      const spring = this.getEnableSpring();
      for (const line of spring ? this.movingLines : this.currentLyricLineObjects) {
        line.update(deltaS);
        if (spring && line.motionSettled) this.movingLines.delete(line);
      }
      for (const line of this.clockMasks) line.paintClockMasks(this.currentTime);
    }
    dispose() {
      super.dispose();
      this.element.remove();
      for (const el of this.currentLyricLineObjects) {
        el.dispose();
      }
      this.currentLyricLineObjects = [];
      this.movingLines.clear();
      this.clockMasks.clear();
      this.bottomLine.dispose();
      this.interludeDots.dispose();
    }
  };
  return __toCommonJS(dom_exports);
})();

(function (root) {
  'use strict';

  // Keep source segments intact. TTML can also contain untimed spaces and
  // punctuation between spans; attach them to a neighbour without adding beats.
  function timedWords(source) {
    const words = [];
    let prefix = '';
    for (const part of source || []) {
      if (!part.text) continue;
      if (!Number.isFinite(part.time) || !(part.duration > 0) || !Number.isFinite(part.duration)) {
        if (words.length) words[words.length - 1].word += part.text;
        else prefix += part.text;
        continue;
      }
      words.push({ word: prefix + part.text, startTime: part.time, endTime: part.time + part.duration });
      prefix = '';
    }
    return words;
  }

  function readingTimeline(vocal) {
    const explicit = timedWords(vocal.romanWords);
    if (explicit.length) return explicit;
    // A line-only transliteration can inherit original or ruby beats only
    // when there is one distinct reading token for each measured beat.
    const tokens = (vocal.roman || '').match(/\S+\s*/g) || [];
    const beats = (vocal.words || []).filter(w => w.duration > 0 && /[\p{L}\p{N}]/u.test(w.text));
    const ruby = beats.flatMap(w => w.ruby?.length ? w.ruby : [{ startTime: w.time, endTime: w.time + w.duration }]);
    const timing = tokens.length === ruby.length ? ruby : beats.map(w => ({ startTime: w.time, endTime: w.time + w.duration }));
    if (!tokens.length || timing.length !== tokens.length || (tokens.length === 1 && !beats.length)) return [];
    return tokens.map((word, i) => ({ word, startTime: timing[i].startTime, endTime: timing[i].endTime }));
  }

  const kanaReadings = new Map();
  for (const [kana, readings] of [
    ['\u3042\u3044\u3046\u3048\u304a', 'a i u e o'], ['\u304b\u304d\u304f\u3051\u3053', 'ka ki ku ke ko'], ['\u304c\u304e\u3050\u3052\u3054', 'ga gi gu ge go'],
    ['\u3055\u3057\u3059\u305b\u305d', 'sa shi su se so'], ['\u3056\u3058\u305a\u305c\u305e', 'za ji zu ze zo'], ['\u305f\u3061\u3064\u3066\u3068', 'ta chi tsu te to'],
    ['\u3060\u3062\u3065\u3067\u3069', 'da ji zu de do'], ['\u306a\u306b\u306c\u306d\u306e', 'na ni nu ne no'], ['\u306f\u3072\u3075\u3078\u307b', 'ha hi fu he ho'],
    ['\u3070\u3073\u3076\u3079\u307c', 'ba bi bu be bo'], ['\u3071\u3074\u3077\u307a\u307d', 'pa pi pu pe po'], ['\u307e\u307f\u3080\u3081\u3082', 'ma mi mu me mo'],
    ['\u3084\u3086\u3088', 'ya yu yo'], ['\u3089\u308a\u308b\u308c\u308d', 'ra ri ru re ro'], ['\u308f\u3092\u3093\u3094', 'wa wo n vu'],
  ]) {
    readings.split(' ').forEach((reading, i) => kanaReadings.set(kana[i], reading));
  }

  function readKana(text) {
    const kana = text.replace(/[\u30a1-\u30f6]/g, char => String.fromCharCode(char.charCodeAt(0) - 0x60));
    let reading = '';
    let geminate = false;
    for (let i = 0; i < kana.length; i++) {
      const char = kana[i];
      if (char === '\u3063' && !geminate) {
        geminate = true;
        continue;
      }
      if (char === '\u30fc' && /[aeiou]$/.test(reading) && !geminate) {
        reading += reading.slice(-1);
        continue;
      }
      let sound = kanaReadings.get(char);
      if (!sound) return '';
      const glide = '\u3083\u3085\u3087'.indexOf(kana[i + 1] || ' ');
      if (glide >= 0 && sound.endsWith('i') && sound.length > 1) {
        const stem = sound.slice(0, -1);
        sound = stem + (/^(sh|ch|j)$/.test(stem) ? '' : 'y') + 'auo'[glide];
        i++;
      }
      if (geminate && !/^[bcdfghjkmprstvz]/.test(sound)) return '';
      reading += (geminate ? (sound.startsWith('ch') ? 't' : sound[0]) : '') + sound;
      geminate = false;
    }
    return geminate ? '' : reading;
  }

  const japaneseWords = typeof Intl.Segmenter === 'function' && Intl.Segmenter.supportedLocalesOf('ja').length
    ? new Intl.Segmenter('ja', { granularity: 'word' }) : null;
  const readingCache = new WeakMap();

  function lexicalReadings(original, tokens, scriptGroups, roman, startTime) {
    if (!japaneseWords) return [];
    const words = [...japaneseWords.segment(original)].filter(part => part.isWordLike);
    if (!words.length || words.some(part => /^[\u3063\u3093\u3083\u3085\u3087\u30fc]+$/u.test(part.segment))) return [];
    const starts = words.map(part => part.index);
    starts[0] = 0;
    starts.push(original.length);

    // Split only within verified phonetic blocks, where the reading boundary can be recovered.
    const offsets = [0];
    let next = 1, romanStart = 0;
    for (let i = 0; i < tokens.length && next < starts.length - 1; i++) {
      const block = tokens[i][0];
      const from = tokens[i].index;
      const reading = scriptGroups[i].roman.toLowerCase();
      while (starts[next] < from + block.length) {
        if (starts[next] < from) return [];
        const head = block.slice(0, starts[next] - from);
        const prefix = /^[a-z0-9]+$/i.test(head) ? head.toLowerCase() : readKana(head);
        if ((head && !prefix) || !reading.startsWith(prefix) || prefix.length >= reading.length) return [];
        offsets.push(romanStart + prefix.length);
        next++;
      }
      romanStart += reading.length;
    }
    if (offsets.length !== starts.length - 1) return [];
    offsets.push(roman.length);
    const groups = [];
    for (let i = 0; i + 1 < starts.length; i++) {
      if (offsets[i + 1] <= offsets[i]) return [];
      groups.push({ text: original.slice(starts[i], starts[i + 1]).trim(),
        roman: roman.slice(offsets[i], offsets[i + 1]), startTime });
    }
    return groups;
  }

  function annotatedReadings(vocal, words) {
    if (!vocal.romanWords?.length || !words.length) return [];
    const groups = [];
    let index = 0;
    for (const caption of timedWords(vocal.romanWords)) {
      const start = index;
      if (words[start]?.startTime !== caption.startTime || !caption.word.trim()) return [];
      let end = caption.startTime;
      while (index < words.length && end < caption.endTime) {
        const word = words[index++];
        if (word.startTime < end || word.endTime > caption.endTime) return [];
        end = word.endTime;
      }
      if (end !== caption.endTime || !Number.isFinite(end)) return [];
      groups.push({ from: start, to: index, roman: caption.word.trim(),
        startTime: caption.startTime, endTime: end });
    }
    return index === words.length ? groups : [];
  }

  // shortcut: match standard kana and unique anchors, expand only with representative source samples.
  function alignedReadings(vocal, words) {
    const original = vocal.content.normalize('NFC');
    const roman = (vocal.roman || '').normalize('NFKC').replace(/[\s.,!?\u3001\u3002\uff01\uff1f\u30fb\u2026]/g, '');
    if (!/[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(original)) return [];
    const explicit = annotatedReadings(vocal, words);
    if (explicit.length) return explicit;
    if (!/^[a-z0-9]+$/i.test(roman)) return [];
    const tokens = [...original.matchAll(/[\p{Script=Hiragana}\p{Script=Katakana}\u30fc]+|[\p{Script=Han}\u3005\u3006]+|[a-z0-9]+/giu)];
    const key = roman.toLowerCase();
    const anchors = tokens.map(([part]) => /^[a-z0-9]+$/i.test(part) ? part.toLowerCase() :
      /[\p{Script=Han}\u3005\u3006]/u.test(part) ? null : readKana(part));
    const groups = [];
    let offset = 0;
    for (let i = 0; i < tokens.length; i++) {
      const anchor = anchors[i];
      const text = original.slice(i === 0 ? 0 : tokens[i].index, tokens[i + 1]?.index).trim();
      if (anchor === "" || !/^[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}\p{P}\s\u3005\u3006\u30fc\da-z]+$/iu.test(text)) return [];
      let end;
      if (anchor === null) {
        // Keep supplied kanji readings only when their boundary is pinned by an unambiguous anchor.
        if (i === tokens.length - 1) end = key.length;
        else {
          const next = anchors[i + 1];
          if (!next) return [];
          end = key.indexOf(next, offset + 1);
          if (end < 0 || key.indexOf(next, end + 1) >= 0) return [];
        }
      } else {
        const particle = { '\u306f': 'wa', '\u3078': 'e', '\u3092': 'o' }[tokens[i][0]];
        const reading = key.startsWith(anchor, offset) ? anchor : particle;
        if (!reading || !key.startsWith(reading, offset)) return [];
        end = offset + reading.length;
      }
      if (end <= offset) return [];
      groups.push({ text, roman: roman.slice(offset, end), startTime: vocal.time });
      offset = end;
    }
    if (offset !== key.length) return [];
    const lexical = vocal.romanWords?.length ? [] : lexicalReadings(original, tokens, groups, roman, vocal.time);
    const preferred = timeReadings(lexical, words, original);
    return preferred.length ? preferred : timeReadings(groups, words, original);
  }

  function timeReadings(groups, words, original) {
    if (!groups.length || !words.length) return groups;
    const compact = text => text.normalize('NFC').replace(/\s/g, '');
    const compactOriginal = compact(original);
    if (words.map(word => compact(word.word)).join('') !== compactOriginal ||
        words.some((word, i) => i && word.startTime < words[i - 1].startTime)) return [];

    // Keep a timed source span intact when it crosses a reading boundary.
    const aligned = [];
    let groupEnd = 0, wordEnd = 0, index = 0, start = 0;
    let reading = '';
    for (const group of groups) {
      groupEnd += compact(group.text).length;
      reading += (reading ? ' ' : '') + group.roman;
      while (wordEnd < groupEnd) wordEnd += compact(words[index++].word).length;
      if (wordEnd !== groupEnd) continue;
      if (groupEnd === compactOriginal.length) index = words.length;
      const parts = words.slice(start, index);
      const startTime = parts.find(word => /[\p{L}\p{N}]/u.test(word.word))?.startTime;
      const endTime = parts[parts.length - 1]?.endTime;
      if (startTime === undefined || !Number.isFinite(endTime) || endTime <= startTime) return [];
      aligned.push({ from: start, to: index, roman: reading, startTime, endTime });
      start = index;
      reading = '';
    }
    return aligned.length === 1 && groups.length > 1 ? [] : aligned;
  }

  function resolveReadings(vocal, words) {
    // Each prepared voice belongs to one published lyric revision.
    let cached = readingCache.get(vocal);
    if (!cached) {
      cached = {};
      readingCache.set(vocal, cached);
    }
    const mode = words.length ? 'timed' : 'line';
    if (!cached[mode]) cached[mode] = alignedReadings(vocal, words);
    return cached[mode].map(({ from, to, ...group }) =>
      from === undefined ? group : { ...group, words: words.slice(from, to) });
  }

  function convert(rows, preferences = {}, songEndMs = 0) {
    const lines = [], rowIndices = [];
    let lastLead = -1;
    for (const [index, row] of rows.entries()) {
      if (row.kind === 'interlude') continue; // The component finds its own instrumental gaps.
      const next = rows[index + 1]?.time ?? songEndMs;
      let mainIndex = -1;
      for (const vocal of [row, ...(row.backingLines || [])]) {
        if (!vocal.content) continue;
        const startTime = vocal.time;
        const fallbackEnd = next > startTime ? next : startTime + 4000;
        const containerEnd = vocal === row && row.explicitEnd === false ? row.visualEnd :
          vocal.sourceEnd ?? vocal.vocalEnd ?? vocal.end;
        const endTime = containerEnd > startTime ? containerEnd : fallbackEnd;
        let words = preferences.karaoke === false ? [] : timedWords(vocal.words);
        const hasWordTiming = words.length > 0;
        const grouped = preferences.roman !== false && preferences.romanGrouping === true;
        const groups = grouped ? resolveReadings(vocal, words) : [];
        const reading = preferences.roman !== false && preferences.romanKaraoke === true && !groups.length ? readingTimeline(vocal) : [];
        if (!words.length) words = [{ word: vocal.content, startTime, endTime }];

        // The upstream renderer pairs exactly one adjacent backing line with
        // its lead. Other voices need independent activation to remain visible.
        const previous = lines[lines.length - 1];
        const hasParent = vocal !== row ? mainIndex >= 0 && mainIndex === lines.length - 1 :
          previous && lastLead === lines.length - 1 && startTime >= previous.startTime && startTime < previous.endTime;
        lines.push({
          words, startTime, endTime,
          ...(preferences.karaoke === false ? { staticOriginal: true } : {}),
          ...(hasWordTiming ? { hasWordTiming: true } : {}),
          ...(reading.length ? { romanWords: reading } : {}),
          ...(groups.length ? { readingGroups: groups } : {}),
          translatedLyric: preferences.translation === false ? '' : vocal.translation || '',
          romanLyric: preferences.roman === false ? '' : vocal.roman || '',
          ...(vocal.backing ? { backgroundVocal: true } : {}),
          isBG: Boolean(vocal.backing && hasParent),
          isDuet: vocal.side === 'right',
        });
        if (vocal === row && !vocal.backing) {
          mainIndex = lines.length - 1;
          lastLead = mainIndex;
        }
        rowIndices.push(index);
      }
    }
    return { lines, rowIndices };
  }

  root.AppleNowPlayingExtLyrics = Object.freeze({ convert });
})(typeof window !== 'undefined' ? window : globalThis);

/* The pinned extSpotify renderer owns the keyframes, masks and row layout.
 * Only the transport clock and the playback-page interactions belong here. */
window.AppleNowPlayingExtView = class {
  constructor(container, seekLine, openMenu) {
    this.player = new ExtSpotify.DomLyricPlayer();
    this.root = this.player.getElement();
    this.needsLayout = true;
    this.root.setAttribute('aria-label', '同步歌词');
    container.replaceChildren(this.root);
    this.nodes = new Map();
    this.animationEnds = new WeakMap();
    this.enabledLines = new Map();
    this.releases = new Map();
    this.player.addEventListener('line-click', event => seekLine(event.lineIndex, event.line.getElement()));
    this.player.addEventListener('line-contextmenu', event => {
      event.preventDefault();
      openMenu(event.line.getElement(), event.clientX, event.clientY);
    });
  }

  configure(prefs, reduced) {
    const p = this.player;
    p.setEnableBlur(!reduced && prefs.lyricBlur);
    if (p.getEnableScale() !== (!reduced && prefs.lyricScale)) p.setEnableScale(!reduced && prefs.lyricScale);
    this.reduced = reduced;
    this.lift = prefs.lyricLift && !reduced;
    p.setAlignPosition(prefs.alignment === 'upper' ? .28 : .46);
    // The default uses the fork's spring and stagger settings verbatim.
    p.setIsSeeking(prefs.scrollStyle === 'spring');
    if (this.scrollStyle !== prefs.scrollStyle) {
      this.scrollStyle = prefs.scrollStyle;
      p.setLinePosYSpringParams({ damping: prefs.scrollStyle === 'spring' ? 12 : 15,
        stiffness: prefs.scrollStyle === 'stagger' ? 72 : 90 });
    }
  }

  set(rows, prefs, endTime, ms) {
    this.released = false;
    const { lines, rowIndices } = window.AppleNowPlayingExtLyrics.convert(rows, prefs, endTime);
    this.player.resetScroll();
    this.ensureLayout();
    this.player.setLyricLines(lines, ms);
    this.nodes.clear();
    this.enabledLines.clear();
    this.releases.clear();
    this.focusNode = undefined;
    this.currentNode = undefined;
    this.player.currentLyricLineObjects.forEach((line, index) => {
      const node = line.getElement();
      const sourceIndex = rowIndices[index];
      node.dataset.action = 'lyric';
      node.dataset.index = sourceIndex;
      node.dataset.time = lines[index].startTime;
      node.setAttribute('role', 'button');
      node.tabIndex = -1;
      if (!this.nodes.has(sourceIndex)) this.nodes.set(sourceIndex, node);
    });
    this.lastTime = undefined;
    this.setFocus(this.nodes.keys().next().value);
  }

  setFocus(index, focus = false) {
    const target = this.nodes.get(index);
    if (!target) return;
    if (this.focusNode !== target) {
      if (this.focusNode) this.focusNode.tabIndex = -1;
      this.focusNode = target;
      target.tabIndex = 0;
    }
    if (focus) target.focus({ preventScroll: true });
  }

  // Retain the original Animation objects, including additive emphasis. Anchor
  // newly created/revealed effects and real discontinuities to the audio clock.
  syncEffect(animation, elapsed, rate, force) {
    let end = this.animationEnds.get(animation);
    if (end === undefined) {
      end = animation.effect.getComputedTiming().endTime;
      this.animationEnds.set(animation, end);
      force = true;
    }
    const target = Math.max(0, Math.min(end, elapsed));
    const playing = rate > 0 && elapsed < end;
    if (playing && animation.playbackRate !== rate) animation.playbackRate = rate;
    if (force || Math.abs((animation.currentTime ?? -Infinity) - target) > (playing ? 45 : .5)) {
      animation.currentTime = target;
    }
    // play() rewinds a finished effect while the audio clock catches up.
    if (playing && animation.playState !== 'running' && animation.currentTime < end) animation.play();
    if (!playing && animation.playState === 'running') animation.pause();
  }

  syncReleases(ms, rate, discontinuity) {
    // Disabled rows fall out of the transport loop while their effects wind down.
    for (const [line, index] of this.enabledLines) {
      if (line.isEnabled) continue;
      this.enabledLines.delete(line);
      for (const word of line.animatedWords) {
        for (const effect of word.elementAnimations) {
          if (effect.id === 'anp-tail-glow') {
            const end = effect.effect.getComputedTiming().endTime;
            this.releases.set(effect, { line, index, word, end });
          } else if (effect.playbackRate < 0) {
            this.releases.set(effect, { line, at: ms, from: Number(effect.currentTime) || 0 });
          }
        }
      }
    }
    for (const [effect, release] of this.releases) {
      if (release.line.isEnabled || !release.line.hasEffects) {
        this.releases.delete(effect);
        continue;
      }
      if (effect.id === 'anp-tail-glow') {
        const { line, index, word, end } = release;
        if (this.reduced || discontinuity) {
          this.syncEffect(effect, end, 0, true);
          this.releases.delete(effect);
          continue;
        }
        const { startTime, tailHandoffTime } = line.getLine();
        const parkedTime = Math.min(ms - startTime, word.tailGlowRestTime);
        if (release.at === undefined && (index < this.player.visualAlignIndex || tailHandoffTime === undefined)) {
          release.at = ms;
          const wordStart = word.startTime - startTime;
          const wordEnd = word.endTime - startTime;
          const reachedPeak = parkedTime >= wordStart + (wordEnd - wordStart) * .35;
          release.from = reachedPeak ? Math.max(parkedTime, wordEnd) : parkedTime;
          release.to = reachedPeak ? end : wordStart;
        }
        const progress = release.at === undefined ? 0 :
          Math.min(1, (ms - release.at) / (end - word.tailGlowRestTime));
        const elapsed = release.at === undefined ? parkedTime :
          release.from + (release.to - release.from) * progress;
        this.syncEffect(effect, elapsed, 0, progress === 1);
        if (progress === 1) this.releases.delete(effect);
        continue;
      }
      const target = this.lift && !discontinuity ? Math.max(0, release.from - (ms - release.at)) : 0;
      if (release.line.steadyVocalLift && effect.id === 'float-word') {
        this.syncEffect(effect, target, 0, discontinuity);
        if (!target) this.releases.delete(effect);
      } else if (!target || !rate) {
        if (effect.playState === 'running') effect.pause();
        effect.currentTime = target;
        if (!target) this.releases.delete(effect);
      } else {
        if (effect.playbackRate !== -rate) effect.playbackRate = -rate;
        if (Math.abs(effect.currentTime - target) > 45) effect.currentTime = target;
        if (effect.playState !== 'running') effect.play();
      }
    }
  }

  ensureLayout() {
    if (!this.needsLayout) return true;
    if (!this.root.clientWidth || !this.root.clientHeight) return false;
    this.player.onResize();
    this.needsLayout = false;
    return true;
  }

  tick(timeMs, now, rate, seek = false) {
    const p = this.player;
    if (!this.ensureLayout()) return;
    const ms = Math.max(0, Math.round(timeMs));
    const delta = this.lastFrame === undefined ? 0 : Math.max(0, now - this.lastFrame);
    const discontinuity = seek || this.lastTime === undefined ||
      Math.abs(ms - this.lastTime - delta * (this.rate || 0)) > 180;
    const transportChanged = this.rate !== rate;
    if (transportChanged) rate ? p.resume() : p.pause();
    this.rate = rate;
    if (ms !== this.lastTime || discontinuity) p.setCurrentTime(ms, discontinuity);
    if (this.reduced && this.hotIndex !== p.scrollToIndex) p.calcLayout(true);
    this.hotIndex = p.scrollToIndex;
    p.update(Math.min(delta, 64));
    this.lastFrame = now;
    this.lastTime = ms;
    this.syncReleases(ms, rate, discontinuity);
    for (const index of p.bufferedLines) {
      const line = p.currentLyricLineObjects[index];
      this.enabledLines.set(line, index);
      const elapsed = ms - line.getLine().startTime;
      const hot = p.hotLines.has(index);
      line.syncReadingGroups(ms);
      for (const word of line.animatedWords) {
        for (const effect of word.elementAnimations) {
          if (effect.id === 'anp-tail-glow') {
            const target = this.reduced ? 0 : Math.min(elapsed, word.tailGlowRestTime);
            this.syncEffect(effect, target, 0, discontinuity);
          } else if (line.steadyVocalLift && effect.id === 'float-word') {
            // Keep one clock driving the lift while overlapping voices share the screen.
            const held = rate > 0 && !discontinuity ? Math.max(elapsed, effect.currentTime ?? 0) : elapsed;
            this.syncEffect(effect, this.lift ? held : 0, 0, discontinuity || transportChanged);
          } else if (hot) {
            this.syncEffect(effect, this.lift ? elapsed : 0, this.lift ? rate : 0, discontinuity || transportChanged);
          }
        }
        if (hot) {
          for (const effect of word.maskAnimations) this.syncEffect(effect, elapsed, rate, discontinuity || transportChanged);
        }
      }
    }
    const current = p.currentLyricLineObjects[p.scrollToIndex]?.getElement();
    if (this.currentNode !== current) {
      this.currentNode?.removeAttribute('aria-current');
      current?.setAttribute('aria-current', 'true');
      this.currentNode = current;
    }
  }

  suspend() {
    this.needsLayout = true;
    this.player.pause();
    for (const effect of this.releases.keys()) effect.pause();
    this.rate = this.lastTime = this.lastFrame = undefined;
  }

  reveal(index) {
    const node = this.nodes.get(index);
    if (!node) return;
    // Offscreen rows are detached by the component; use its measured geometry.
    const p = this.player;
    const line = p.currentLyricLineObjects.find(item => item.getElement() === node);
    if (!line) return;
    p.revealLine(line);
    this.setFocus(index, true);
  }

  releaseRows() {
    this.suspend();
    this.player.setLyricLines([], 0);
    this.nodes.clear();
    this.releases.clear();
    this.enabledLines.clear();
    this.focusNode = this.currentNode = undefined;
    this.released = true;
  }

  dispose() {
    this.player.dispose();
    this.nodes.clear();
  }
};


(() => {
  'use strict';

  const icons = {
    music: '<path d="M9 18V5l12-2v13M9 18c0 3-6 4-6 1s6-4 6-1Zm12-2c0 3-6 4-6 1s6-4 6-1Z"/>',
    play: '<path fill="currentColor" stroke="none" d="M4 3.9c0-1.6 1.7-2.5 3-1.7l14 8.1c1.3.8 1.3 2.6 0 3.4l-14 8.1c-1.3.8-3-.1-3-1.7z"/>',
    pause: '<rect fill="currentColor" stroke="none" x="5" y="2.5" width="5" height="19" rx="1.5"/><rect fill="currentColor" stroke="none" x="14" y="2.5" width="5" height="19" rx="1.5"/>',
    next: '<path fill="currentColor" stroke="none" d="M2 6.1c0-1 1.1-1.7 2-1.1l8 5v-4c0-1 1.1-1.7 2-1.1l9 5.9c.8.5.8 1.7 0 2.2l-9 5.9c-.9.6-2-.1-2-1.1v-4l-8 5C3.1 19.6 2 19 2 18Z"/>',
    shuffle: '<path d="M3 6h2.5c4.8 0 6.2 12 11 12H21m-3-3 3 3-3 3M3 18h2.5c4.8 0 6.2-12 11-12H21m-3-3 3 3-3 3"/>',
    repeat: '<path d="M3.5 10V8a3 3 0 0 1 3-3H20m-3-3 3 3-3 3m3.5 6v2a3 3 0 0 1-3 3H4m3-3-3 3 3 3"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    order: '<path d="M4 6h16M4 12h16M4 18h10m3-3 3 3-3 3"/>',
    more: '<path stroke-width="3.4" d="M4 12h.01m7.99 0h.01m7.99 0h.01"/>',
    volume: '<path d="M3 9h4l5-4v14l-5-4H3zM15 9c1.6 1.6 1.6 4.4 0 6m2.5-8.5c3 3 3 8 0 11"/>',
    quiet: '<path d="M3 9h4l5-4v14l-5-4H3zM15 9c1.6 1.6 1.6 4.4 0 6"/>',
    lyrics: '<path d="M8 19h-.5A4.5 4.5 0 0 1 3 14.5v-6A4.5 4.5 0 0 1 7.5 4h9A4.5 4.5 0 0 1 21 8.5v6a4.5 4.5 0 0 1-4.5 4.5H13l-5 3z"/><path d="M8 9h2v2c0 1.4-.7 2.2-1.5 2.7M14 9h2v2c0 1.4-.7 2.2-1.5 2.7"/>',
    queue: '<path d="M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01"/>',
    settings: '<path d="M9.5 3h5l.6 2.2 1.4.8 2.2-.6 2.5 4.3-1.6 1.6v1.4l1.6 1.6-2.5 4.3-2.2-.6-1.4.8-.6 2.2h-5l-.6-2.2-1.4-.8-2.2.6-2.5-4.3 1.6-1.6v-1.4L2.8 9.7l2.5-4.3 2.2.6 1.4-.8z"/><circle cx="12" cy="12" r="3.2"/>',
    translate: '<defs><mask id="apple-now-playing-icon-translate-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><rect width="24" height="24" fill="white" stroke="none"/><text x="16" y="17.4" text-anchor="middle" font-family="Microsoft YaHei, sans-serif" font-size="10" font-weight="700" fill="black" stroke="none">文</text></mask></defs><path d="M13.5 4H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h1v3l3-3h4.5a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z"/><text x="8.8" y="12.3" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="9" font-weight="700" fill="currentColor" stroke="none">A</text><path d="M12 8h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-1v3l-3-3h-4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" fill="currentColor" stroke="none" mask="url(#apple-now-playing-icon-translate-cut)"/>',
    karaoke: '<defs><clipPath id="apple-now-playing-icon-karaoke-half"><rect width="12" height="24"/></clipPath></defs><path fill="currentColor" stroke="none" opacity=".36" fill-rule="evenodd" d="M4.2 20 10.3 4h3.4l6.1 16h-3.5l-1.2-3.6H8.9L7.7 20H4.2Zm5.7-6.5h4.2L12 7.1l-2.1 6.4Z"/><path fill="currentColor" stroke="none" fill-rule="evenodd" clip-path="url(#apple-now-playing-icon-karaoke-half)" d="M4.2 20 10.3 4h3.4l6.1 16h-3.5l-1.2-3.6H8.9L7.7 20H4.2Zm5.7-6.5h4.2L12 7.1l-2.1 6.4Z"/>',
    roman: '<text x="12" y="19.5" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="28" font-weight="600" fill="currentColor" stroke="none">a</text>',
    screen: '<path d="M14 3h7v7m0-7-7 7m-4 11H3v-7m0 7 7-7"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
  };

  function icon(name) {
    const previous = name === 'previous';
    return '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      (previous ? '<g transform="translate(24 0) scale(-1 1)">' + icons.next + '</g>' : icons[name]) + '</svg>';
  }

  function button(action, label, symbol, className = '') {
    return '<button type="button" class="apple-now-playing-icon ' + className + '" data-action="' + action +
      '" aria-label="' + label + '" title="' + label + '">' + icon(symbol) + '</button>';
  }

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const text = (element, value) => { if (element.textContent !== value) element.textContent = value; };
  const artists = (items) => Array.isArray(items)
    ? items.map(item => typeof item === 'string' ? item : item?.name).filter(Boolean).join(' / ')
    : typeof items === 'string' ? items : '';
  const number = (value) => value == null || value === '' || !Number.isFinite(Number(value)) ? undefined : Number(value);
  const lyricSpringSettings = Object.freeze({ duration: 560, dampingRatio: .83 });
  const panelSpringSettings = Object.freeze({ duration: 520, dampingRatio: .78 });
  const lyricPanelFadeSettings = Object.freeze({ outDuration: 200, inDuration: 180, slideInDelay: 90 });
  const pageTransitionSettings = Object.freeze({
    open: { duration: 360, background: [0, 360, .98], cover: 320, meta: [110, 235, 8], controls: [130, 290, 10], panel: [155, 345, 12] },
    close: { duration: 380, detach: 80, lead: .08, travel: .45, slideEase: 'cubic-bezier(.35,.12,.35,1)' },
    fade: 120, reduced: 100, easing: 'cubic-bezier(.2,.7,.2,1)',
  });

  const storagePrefix = 'apple-now-playing.';
  const preferencesKey = storagePrefix + 'preferences-v2';
  const offsetsKey = storagePrefix + 'lyric-offsets';
  const takeoverKey = storagePrefix + 'takeover-vinyl';
  const settingDefinitions = [
    { group: '歌词', key: 'karaoke', label: '开启逐字', value: true },
    { group: '歌词', key: 'translation', label: '显示译文', value: true },
    { group: '歌词', key: 'roman', label: '显示罗马音', value: true },
    { group: '歌词', key: 'romanKaraoke', label: '开启罗马音逐字', value: true },
    { group: '歌词', key: 'romanGrouping', label: '罗马音分词', value: false },
    { group: '歌词', key: 'preview', label: '进度条歌词预览', value: true },
    { group: '歌词', key: 'originalBold', label: '原文歌词加粗', value: true },
    { group: '歌词', key: 'lyricFade', label: '歌词渐隐', value: true },
    { group: '歌词', key: 'lyricScale', label: '歌词缩放', value: true },
    { group: '歌词', key: 'lyricBlur', label: '歌词模糊', value: true },
    { group: '歌词', key: 'fontSize', label: '原文字号', value: 'auto',
      options: [['auto', '随窗口调整'], ...[24, 28, 32, 36, 42, 48, 54, 60].map(size => [String(size), size + ' px'])] },
    { group: '歌词', key: 'translationSize', label: '译文相对字号', value: 64, min: 40, max: 100, step: 2 },
    { group: '歌词', key: 'romanSize', label: '罗马音相对字号', value: 64, min: 40, max: 100, step: 2 },
    { group: '歌词', key: 'backgroundVocalSize', label: '背景歌词大小', value: 24, min: 12, max: 72, step: 1, unit: 'px' },
    { group: '歌词', key: 'duetSize', label: '对唱歌词大小', value: 36, min: 12, max: 72, step: 1, unit: 'px' },
    { group: '歌词', key: 'alignment', label: '当前行位置', value: 'middle',
      options: [['upper', '靠上'], ['middle', '居中']] },
    { group: '歌词', key: 'scrollbar', label: '手动滚动时显示歌词滚动条', value: true },
    { group: '歌词', key: 'lyricLift', label: '歌词上浮', value: true },
    { group: '歌词', key: 'scrollStyle', label: '滚动方式', value: 'spring',
      options: [['normal', '平滑移动'], ['spring', '轻微回弹'], ['stagger', '逐行错开']] },
    { group: '歌词', key: 'globalOffset', label: '全局歌词偏移', value: 0, min: -10000, max: 10000, step: 100, unit: 'ms' },
    { group: '外观', key: 'display', label: '显示内容', value: 'all',
      options: [['all', '全部'], ['lyrics', '仅歌词'], ['cover', '仅封面']] },
    { group: '外观', key: 'alias', label: '别名与译名', value: 'translated',
      options: [['hidden', '隐藏'], ['alias', '别名优先'], ['translated', '译名优先'], ['both', '同时显示']] },
    { group: '外观', key: 'background', label: '背景', value: 'fluid',
      options: [['gradient', '渐变'], ['blur', '模糊封面'], ['solid', '纯色'], ['fluid', '流体'], ['fluid-static', '静态流体']] },
    { group: '外观', key: 'motion', label: '背景缓慢漂移', value: true, when: 'gradient' },
    { group: '外观', key: 'gradientDim', label: '渐变暗化', value: 0, min: 0, max: 60, step: 2, when: 'gradient' },
    { group: '外观', key: 'blur', label: '封面模糊', value: 60, min: 10, max: 100, step: 2, when: 'blur' },
    { group: '外观', key: 'blurDim', label: '模糊背景暗化', value: 30, min: 0, max: 60, step: 2, when: 'blur' },
    { group: '外观', key: 'coverShadow', label: '封面阴影', value: true },
    { group: '外观', key: 'textShadow', label: '文字阴影', value: true },
    { group: '外观', key: 'textGlow', label: '文字辉光', value: true },
    { group: '外观', key: 'fluidQuality', label: '流体画质', value: 'balanced', when: ['fluid', 'fluid-static'],
      options: [['low', '性能'], ['balanced', '均衡'], ['high', '精细']] },
    { group: '外观', key: 'fluidFps', label: '流体帧率', value: '30', when: 'fluid',
      options: [['5', '5 FPS'], ['10', '10 FPS'], ['30', '30 FPS'], ['60', '60 FPS'], ['screen', '跟随屏幕']] },
    { group: '外观', key: 'audioReactive', label: '跟随鼓点震动', value: false },
    { group: '字体', key: 'customFont', label: '使用自定义字体', value: false },
    { group: '字体', key: 'fontPreset', label: '字体预设', value: 'system',
      options: [['system', '默认'], ['misans', 'MiSans'], ['source-sans', '思源黑体'], ['source-serif', '思源宋体'],
        ['pingfang', '苹方'], ['yahei', '微软雅黑'], ['jhenghei', '微软正黑'], ['custom', '自定义顺序']] },
    { group: '字体', key: 'fontFamilies', label: '字体回退顺序', value: '', kind: 'text' },
  ];

  function storedValue(key) {
    const suffix = key.slice(storagePrefix.length);
    let value = null;
    try {
      value = localStorage.getItem(key);
      // Only migration reads historical storage namespaces.
      for (const prefix of ['apple-playing.', 'apple-style-now-playing.']) {
        const oldKey = prefix + suffix;
        const oldValue = localStorage.getItem(oldKey);
        if (oldValue === null) continue;
        if (value === null) {
          value = oldValue;
          localStorage.setItem(key, value);
        }
        localStorage.removeItem(oldKey);
      }
    } catch (error) {
      console.warn('[AppleNowPlaying] 旧版偏好迁移失败', error);
    }
    return value;
  }

  function storedObject(key) {
    try {
      const value = JSON.parse(storedValue(key) || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch (_) {
      return {};
    }
  }

  function settingValue(definition, value) {
    if (definition.kind === 'text') return typeof value === 'string' ? value.replace(/[\u0000-\u001f]/g, ' ').slice(0, 512).trim() : definition.value;
    if (definition.options) return definition.options.some(([key]) => key === value) ? value : definition.value;
    if (typeof definition.value === 'boolean') return typeof value === 'boolean' ? value : definition.value;
    return clamp(number(value) ?? definition.value, definition.min, definition.max);
  }

  const savedPreferences = storedObject(preferencesKey);
  const hasLegacyLyricMotion = ['wordMotion', 'fillStyle', 'longNote'].some(key => key in savedPreferences);
  if (typeof savedPreferences.lyricLift !== 'boolean') {
    if (savedPreferences.wordMotion === 'none') savedPreferences.lyricLift = false;
    if (['word', 'character', 'slide'].includes(savedPreferences.wordMotion)) savedPreferences.lyricLift = true;
  }
  const preferences = Object.fromEntries(settingDefinitions.map(definition =>
    [definition.key, settingValue(definition, savedPreferences[definition.key])]));
  const songOffsets = storedObject(offsetsKey);
  if (hasLegacyLyricMotion || 'scheme' in savedPreferences || savedPreferences.background === 'none' ||
      'backingSize' in savedPreferences || 'blankBlur' in savedPreferences || 'blankDim' in savedPreferences) {
    saveObject(preferencesKey, preferences);
  }

  function saveObject(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn('[AppleNowPlaying] 偏好保存失败', error);
      return false;
    }
  }

  // Both lyrics and queue use measured row heights. DOM stays bounded while
  // their complete source data and stable scroll anchors remain available.
  class AppleNowPlayingViewportList {
    constructor(scroller, content, createRow, estimate) {
      this.scroller = scroller;
      if (!scroller.hasAttribute('tabindex')) scroller.tabIndex = -1;
      this.content = content;
      this.createRow = createRow;
      this.estimate = estimate;
      this.items = [];
      this.keys = [];
      this.indices = new Map();
      this.heights = new Map();
      this.nodes = new Map();
      this.range = '';
      this.tops = [0];
      this.padding = 0;
      this.bottomPadding = 0;
      this.pinned = [];
    }

    connect(signal) {
      this.disconnect();
      this.observer = new ResizeObserver(entries => {
        const anchor = this.capture();
        let changed = false;
        for (const entry of entries) {
          const index = Number(entry.target.dataset.rowIndex);
          if (this.nodes.get(index) !== entry.target) continue;
          const height = entry.target.offsetHeight;
          const key = this.keys[index];
          if (key && height > 0 && Math.abs((this.heights.get(key) || 0) - height) > 1) {
            this.heights.set(key, height);
            changed = true;
          }
        }
        if (changed) {
          this.layout();
          this.restore(anchor);
          if (this.scrollMotion) {
            const { index, align } = this.scrollMotion;
            this.scrollTo(index, align, true);
          }
          this.render();
          this.afterMeasure?.();
        }
      });
      for (const node of this.nodes.values()) this.observer.observe(node);
      this.scroller.addEventListener('scroll', () => this.render(), { passive: true, signal });
      this.render();
    }

    disconnect() {
      this.stopScroll();
      this.observer?.disconnect();
      this.observer = undefined;
    }

    set(items, keyOf, resetHeights = false) {
      const focused = [...this.nodes].find(([, node]) => node.contains(document.activeElement));
      const focusKey = focused ? this.keys[focused[0]] : undefined;
      if (resetHeights) this.heights.clear();
      for (const node of this.nodes.values()) this.observer?.unobserve(node);
      this.nodes.clear();
      this.content.replaceChildren();
      this.stopScroll();
      this.items = items;
      this.keys = items.map(keyOf);
      this.indices = new Map(this.keys.map((key, index) => [key, index]));
      for (const key of this.heights.keys()) if (!this.indices.has(key)) this.heights.delete(key);
      const focusIndex = this.indices.get(focusKey);
      this.pinned = focusIndex === undefined ? [] : [focusIndex];
      this.layout();
      this.render();
      if (focusIndex !== undefined) {
        const node = this.nodes.get(focusIndex);
        (node?.querySelector('button') || node)?.focus({ preventScroll: true });
      } else if (focused) {
        this.scroller.focus({ preventScroll: true });
      }
    }

    layout() {
      this.range = '';
      this.tops = [this.padding];
      for (let index = 0; index < this.items.length; index++) {
        this.tops.push(this.tops[index] + (this.heights.get(this.keys[index]) || this.estimate(this.items[index])));
      }
      this.content.style.height = (this.tops[this.items.length] + this.bottomPadding) + 'px';
      for (const [index, node] of this.nodes) node.style.top = this.tops[index] + 'px';
    }

    indexAt(top) {
      let low = 0, high = this.items.length;
      while (low < high) {
        const mid = (low + high) >> 1;
        if (this.tops[mid + 1] < top) low = mid + 1;
        else high = mid;
      }
      return Math.min(low, Math.max(0, this.items.length - 1));
    }

    capture() {
      const index = this.indexAt(this.scroller.scrollTop);
      return { key: this.keys[index], offset: this.scroller.scrollTop - this.tops[index] };
    }

    restore(anchor) {
      const index = this.indices.get(anchor?.key);
      if (index !== undefined) this.scroller.scrollTop = Math.max(0, this.tops[index] + anchor.offset);
    }

    render() {
      if (!this.items.length) return;
      const top = this.scroller.scrollTop;
      const height = this.height || this.scroller.clientHeight || 600;
      const start = this.indexAt(Math.max(0, top - height));
      const end = this.indexAt(top + height * 2);
      const range = [start, end, ...this.pinned].join(',');
      if (range === this.range) return;
      this.range = range;
      const wanted = new Set(this.pinned);
      for (let index = start; index <= end; index++) wanted.add(index);
      for (const [index, node] of this.nodes) {
        if (!wanted.has(index) && !node.contains(document.activeElement)) {
          this.observer?.unobserve(node);
          node.remove();
          this.nodes.delete(index);
        }
      }
      for (const index of [...wanted].sort((a, b) => a - b)) {
        if (index < 0 || index >= this.items.length || this.nodes.has(index)) continue;
        const node = this.createRow(this.items[index], index);
        node.dataset.rowIndex = index;
        node.style.top = this.tops[index] + 'px';
        this.nodes.set(index, node);
        const next = [...this.content.children].find(child => Number(child.dataset.rowIndex) > index);
        this.content.insertBefore(node, next || null);
        this.observer?.observe(node);
      }
    }

    stopScroll() {
      if (!this.scrollMotion) return;
      this.scrollMotion.animation?.cancel();
      if (this.scrollMotion.column) this.content.style.removeProperty('transform');
      for (const node of this.nodes.values()) node.style.removeProperty('transform');
      this.scrollMotion = undefined;
    }

    scrollTo(index, align, smooth) {
      if (index < 0 || index >= this.items.length) return;
      this.pinned = [...new Set([...this.pinned, index])].slice(-12);
      const from = this.scroller.scrollTop;
      const target = this.targetTop(index, align);
      const mode = this.scrollMode?.();
      if (!mode || !smooth || reducedMotion.matches || Math.abs(target - from) > this.scroller.clientHeight) {
        this.stopScroll();
        this.scroller.scrollTop = target;
        this.render();
        return;
      }
      // Commit the new layout once. Carry each row's onscreen displacement
      // and velocity across handoffs, including a second line before settling.
      const previous = this.scrollMotion;
      this.scroller.scrollTop = target;
      const delta = this.scroller.scrollTop - from;
      if (Math.abs(delta) < .5) return;
      this.render();
      if (mode === 'normal') {
        const offset = (previous?.column?.offset || 0) + delta;
        const frequency = 10.5;
        const direction = -Math.sign(offset);
        const velocity = direction * clamp(direction * (previous?.column?.velocity || 0), 0, frequency * Math.abs(offset));
        this.stopScroll();
        this.content.style.transform = 'translateY(' + offset.toFixed(2) + 'px)';
        this.scrollMotion = { column: { offset, velocity }, last: performance.now(), index, align, frequency };
        return;
      }
      if (mode === 'spring') {
        const carried = previous ? new DOMMatrix(getComputedStyle(this.content).transform).m42 : 0;
        const velocity = springVelocity(previous);
        this.stopScroll();
        const { duration, dampingRatio } = lyricSpringSettings;
        const positions = springPositions(carried + delta, velocity, duration, dampingRatio);
        const animation = this.content.animate(positions.map(y => ({ transform: 'translate3d(0,' + y + 'px,0)' })), {
          duration, fill: 'backwards',
        });
        const motion = this.scrollMotion = { animation, positions, duration, index, align };
        animation.finished.then(() => {
          if (this.scrollMotion === motion) this.stopScroll();
        }, () => {});
        return;
      }
      const now = performance.now();
      const direction = Math.sign(delta);
      const first = this.indexAt(direction > 0 ? from : from + this.scroller.clientHeight);
      const gap = Math.abs(this.items[index].time - (this.items[index - direction]?.time ?? 0));
      const slow = clamp((gap - 700) / 2400, 0, 1);
      const frequency = Math.sqrt(172 - 66 * slow);
      const rows = new Map();
      for (const [i, node] of this.nodes) {
        const old = previous?.rows.get(i);
        const offset = (old?.offset || 0) + delta;
        const velocity = old?.velocity || 0;
        const delay = Math.min(5, Math.max(0, (i - first) * direction)) * 36;
        rows.set(i, { offset, velocity, delay });
        node.style.transform = 'translateY(' + offset.toFixed(2) + 'px)';
      }
      this.scrollMotion = { rows, last: now, index, align, frequency, damping: .87 };
    }

    targetTop(index, align) {
      const height = this.heights.get(this.keys[index]) || this.estimate(this.items[index]);
      return Math.max(0, this.tops[index] + height / 2 - this.scroller.clientHeight * align);
    }

    step(time) {
      const motion = this.scrollMotion;
      if (!motion || motion.animation) return;
      const elapsed = Math.max(0, time - motion.last);
      motion.last = Math.max(time, motion.last);
      if (motion.column) {
        const { column, frequency } = motion;
        const dt = elapsed / 1000;
        // Advance the actual position and velocity, including retargets mid-flight.
        const slope = column.velocity + frequency * column.offset;
        const envelope = Math.exp(-frequency * dt);
        column.offset = envelope * (column.offset + slope * dt);
        column.velocity = envelope * (column.velocity - frequency * slope * dt);
        if (Math.abs(column.offset) < .12 && Math.abs(column.velocity) < 2) this.stopScroll();
        else this.content.style.transform = 'translateY(' + column.offset.toFixed(2) + 'px)';
        return;
      }
      const decay = motion.frequency * motion.damping;
      const angular = motion.frequency * Math.sqrt(1 - motion.damping ** 2);
      for (const [index, row] of motion.rows) {
        const node = this.nodes.get(index);
        if (!node) { motion.rows.delete(index); continue; }
        const dt = Math.max(0, elapsed - row.delay) / 1000;
        row.delay = Math.max(0, row.delay - elapsed);
        if (!dt) continue;
        const start = row.offset;
        const envelope = Math.exp(-decay * dt);
        const sineTerm = (row.velocity + decay * start) / angular;
        const angle = angular * dt, cosine = Math.cos(angle), sine = Math.sin(angle);
        row.offset = envelope * (start * cosine + sineTerm * sine);
        row.velocity = -decay * row.offset + envelope * angular * (sineTerm * cosine - start * sine);
        if (Math.abs(row.offset) < .12 && Math.abs(row.velocity) < 2) {
          node.style.removeProperty('transform');
          motion.rows.delete(index);
        } else node.style.transform = 'translateY(' + row.offset.toFixed(2) + 'px)';
      }
      if (!motion.rows.size) this.scrollMotion = undefined;
    }
  }

  // A small Canvas2D surface is scaled by the compositor. Sampling the cover
  // once keeps fluid frames independent from image loading and color analysis.
  class AppleNowPlayingFluidBackground {
    constructor(canvas) {
      this.canvas = canvas;
      this.context = canvas.getContext('2d', { alpha: false });
      this.cover = document.createElement('canvas');
      this.cover.width = this.cover.height = 48;
      this.coverContext = this.cover.getContext('2d');
      this.stamps = [];
      this.nextFrame = 0;
      this.phase = 0;
      this.lastFrame = 0;
      this.dirty = true;
      this.colors = ['#484848', '#585858', '#383838'];
    }

    setCover(image, colors) {
      this.colors = colors || ['#484848', '#585858', '#383838'];
      // Select actual local colors instead of averaging each full column.
      // Broad light, dark and chromatic regions give the flow its depth.
      let palette = this.colors;
      if (image && this.coverContext) {
        try {
          this.coverContext.drawImage(image, 0, 0, 48, 48);
          const pixels = this.coverContext.getImageData(0, 0, 48, 48).data;
          const tiles = [];
          for (let y = 0; y < 48; y += 8) for (let x = 0; x < 48; x += 8) {
            const rgb = [0, 0, 0];
            for (let dy = 0; dy < 8; dy++) for (let dx = 0; dx < 8; dx++) {
              const k = 4 * ((y + dy) * 48 + x + dx);
              for (let c = 0; c < 3; c++) rgb[c] += pixels[k + c] / 64;
            }
            tiles.push(rgb);
          }
          const luma = rgb => .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
          tiles.sort((a, b) => luma(a) - luma(b));
          const chosen = [tiles[4], tiles[28]];
          while (chosen.length < 5) {
            const distance = rgb => Math.min(...chosen.map(p => rgb.reduce((sum, ch, c) => sum + (ch - p[c]) ** 2, 0)));
            chosen.push(tiles.reduce((best, rgb) => distance(rgb) > distance(best) ? rgb : best));
          }
          palette = chosen.map(rgb => {
            const brightness = luma(rgb);
            const gain = Math.min(.93, 138 / Math.max(1, brightness));
            return 'rgb(' + rgb.map(ch => Math.round(clamp(7 + (brightness + 1.12 * (ch - brightness)) * gain, 0, 255))).join(',') + ')';
          });
        } catch (_) { /* Reading some local cover origins is restricted. */ }
      }
      this.stamps = palette.map(color => {
        const tile = document.createElement('canvas');
        tile.width = tile.height = 144;
        const ctx = tile.getContext('2d');
        const gradient = ctx.createRadialGradient(72, 72, 0, 72, 72, 72);
        gradient.addColorStop(0, color);
        gradient.addColorStop(.32, color);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 144, 144);
        return tile;
      });
      this.dirty = true;
    }

    invalidate() {
      this.dirty = true;
      this.lastFrame = 0;
    }

    stop() {
      this.lastFrame = this.nextFrame = 0;
      this.canvas.width = this.canvas.height = 0;
      this.stamps.length = 0;
      this.dirty = true;
    }

    draw(time, level) {
      if (!this.context) return;
      const fluid = ['fluid', 'fluid-static'].includes(preferences.background);
      if (this.canvas.hidden !== !fluid) this.canvas.hidden = !fluid;
      if (!fluid || !activity || document.hidden) return;
      const moving = preferences.background === 'fluid' && !reducedMotion.matches;
      const fps = preferences.fluidFps === 'screen' ? 0 : Number(preferences.fluidFps);
      if (!this.dirty && (!moving || (fps && time + .5 < this.nextFrame))) return;
      const interval = fps ? 1000 / fps : 0;
      this.nextFrame = interval && this.nextFrame > time - interval ? this.nextFrame + interval : time + interval;
      const edge = { low: 288, balanced: 448, high: 640 }[preferences.fluidQuality];
      const ratio = innerWidth / Math.max(1, innerHeight);
      const width = ratio >= 1 ? edge : Math.round(edge * ratio);
      const height = ratio >= 1 ? Math.round(edge / ratio) : edge;
      if (this.canvas.width !== width || this.canvas.height !== height) {
        this.canvas.width = width;
        this.canvas.height = height;
      }
      if (moving && this.lastFrame) this.phase += Math.min(500, time - this.lastFrame) / 1000;
      this.lastFrame = time;
      this.dirty = false;
      const ctx = this.context;
      const phase = this.phase;
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = this.colors[2];
      ctx.fillRect(0, 0, width, height);
      const extent = Math.max(width, height);
      this.stamps.forEach((tile, i) => {
        const phaseX = phase * (.12 + i * .014) + i * 2.40;
        const phaseY = phase * (.105 + i * .01) + i * 1.67;
        const x = width * (.5 + .46 * Math.cos(phaseX));
        const y = height * (.5 + .44 * Math.sin(phaseY));
        const radius = extent * (.62 + .10 * Math.sin(phaseY + .7) + .07 * level);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(.50 * Math.sin(phaseX * .66 + i));
        ctx.scale(1.30, .78 + .12 * Math.sin(phaseY));
        ctx.drawImage(tile, -radius, -radius, 2 * radius, 2 * radius);
        ctx.restore();
      });
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  const vinylSelector =  'footer [data-testid="tid_btn_pc_minibar_vinyl"], footer .miniVinylWrapper';
  const controls = {
    play: 'tid_playbar_play_btn', previous: 'tid_playbar_prev_btn', next: 'tid_playbar_next_btn',
    favorite: 'tid_redstar_btn', queue: 'tid_playbar_playlist_btn', mode: 'tid_playmode_btn',
  };
  const modes = {
    playOrder: ['顺序播放', 'order'], playCycle: ['列表循环', 'repeat'],
    playOneCycle: ['单曲循环', 'repeat'], playRandom: ['随机播放', 'shuffle'],
    playAi: ['心动模式', 'heart'], playFm: ['私人漫游', 'repeat'],
  };

  function makeHost() {
    let runtime, root, store, watchedStore, storeOff;
    let progressStream, progressSubscription, latestProgress, progressReceipt = 0;
    let changeListener, progressListener;
    let seekSequence = 0;

    function modules() {
      if (!runtime) {
        const chunks = window.webpackJsonp;
        if (!Array.isArray(chunks) || chunks.push === Array.prototype.push) return;
        // Capture the current runtime to read the initialized 3.1.41 player modules.
        const key = 'apple-now-playing-host';
        const entry = [[], { [key]: (_module, _exports, require) => { runtime = require; } }, [[key]]];
        try {
          chunks.push(entry);
        } catch (error) {
          console.warn('[AppleNowPlaying] 无法获取宿主播放模块', error);
        } finally {
          if (runtime?.c) delete runtime.c[key];
          if (runtime?.m) delete runtime.m[key];
          const index = chunks.indexOf(entry);
          if (index >= 0) chunks.splice(index, 1);
        }
      }
      return runtime?.c;
    }

    function findStore() {
      const currentRoot = document.getElementById('root');
      if (root !== currentRoot) {
        store = null;
        root = currentRoot;
      }
      // The host DVA helper exposes the same Redux store as the React provider.
      const hostStore = modules()?.[8]?.exports?.a?.app?._store;
      if (typeof hostStore?.getState === 'function') return hostStore;
      if (store || !root) return store;
      const container = Object.keys(root).find(key => key.startsWith('__reactContainer'));
      const fibers = [root._reactRootContainer?._internalRoot?.current || root[container]];
      for (let index = 0; index < fibers.length && index < 120; index++) {
        const fiber = fibers[index];
        if (!fiber) continue;
        const candidate = fiber.memoizedProps?.store || fiber.memoizedState?.element?.props?.store;
        if (typeof candidate?.getState === 'function') return store = candidate;
        fibers.push(fiber.child, fiber.sibling);
      }
    }

    const footers = document.getElementsByTagName('footer');
    function footerElement(selector) {
      for (const footer of footers) {
        const target = footer.querySelector(selector);
        if (target) return target;
      }
    }

    function control(name) {
      if (name === 'cover') return footerElement('[data-testid="tid_btn_pc_minibar_vinyl"], .miniVinylWrapper');
      const target = footerElement('[data-testid="' + controls[name] + '"]');
      return target?.querySelector('button') || target;
    }

    function available(target) {
      return !!target && !target.disabled && target.getAttribute('aria-disabled') !== 'true';
    }

    function bridge() {
      if (typeof legacyNativeCmder !== 'undefined' && typeof legacyNativeCmder._envAdapter?.callAdapter === 'function') {
        return legacyNativeCmder._envAdapter.callAdapter.bind(legacyNativeCmder._envAdapter);
      }
      if (typeof channel !== 'undefined' && typeof channel.call === 'function') return channel.call.bind(channel);
    }

    function getTrack(playing) {
      return playing.curTrack || playing.curPlaying?.track || playing.curVoice || {};
    }

    function getId(playing) {
      return String(playing.resourceTrackId || getTrack(playing).id || '');
    }

    function syncSubscriptions(currentStore, stream) {
      if (!changeListener) return;
      if (currentStore !== watchedStore) {
        storeOff?.();
        watchedStore = currentStore;
        latestProgress = undefined;
        storeOff = currentStore?.subscribe?.(changeListener);
      }
      if (stream === progressStream) return;
      progressSubscription?.unsubscribe();
      progressStream = stream;
      latestProgress = undefined;
      // Use the host's shared progress observable without replacing native callbacks.
      progressSubscription = stream?.subscribe?.(event => {
        if (number(event?.current) === undefined) return;
        const id = watchedStore?.getState()?.playing?.playId;
        if (!id || String(id) !== String(event.playId)) return;
        latestProgress = event;
        progressListener?.(event, ++progressReceipt);
      });
    }

    function read() {
      const currentStore = findStore();
      const cache = modules();
      const audio = cache?.[148]?.exports;
      syncSubscriptions(currentStore, audio?.e);
      const state = currentStore?.getState();
      const playing = state?.playing || {};
      const track = getTrack(playing);
      const id = getId(playing);
      const hostPlayId = String(playing.playId || '');
      const sessionTrack = hostPlayId.split('_')[0];
      const playId = [id, String(track.id || ''), String(playing.onlineResourceId || '')].includes(sessionTrack) ? hostPlayId : '';
      const restoredPosition = number(playing.restoreResource?.current);
      const lastAudioProgress = typeof audio?.b === 'function' ? audio.b() : undefined;
      const audioProgress = [latestProgress, lastAudioProgress].find(event => playId && String(event?.playId) === playId);
      const nativePosition = number(audioProgress?.current);
      const playButton = control('play');
      const favorite = control('favorite');
      const modeButton = control('mode');
      const modeIcon = playing.playingMode === 'playAi' ? modeButton?.querySelector('svg') : undefined;
      const favoriteIcon = favorite?.querySelector('[role=img], svg');
      const playLabel = [playButton?.getAttribute('aria-label'), playButton?.querySelector('[role=img], svg')?.getAttribute('aria-label')].join(' ');
      const likeLabel = [favorite?.getAttribute('aria-label'), favoriteIcon?.getAttribute('aria-label'),
        favoriteIcon?.getAttribute('title'), favoriteIcon?.querySelector('title')?.textContent].join(' ');
      const slider = footerElement('.slider-default input[type=range], .slider-default [role=slider]');
      const sliderMax = number(slider?.max || slider?.getAttribute('aria-valuemax'));
      const sliderValue = sliderMax > 0 ? number(slider?.value ?? slider?.getAttribute('aria-valuenow')) : undefined;
      const duration = id ? Math.max(0, number(playing.resourceDuration) || sliderMax || 0) : 0;
      const sample = number(cache?.[109]?.exports?.b?.getValue?.()) ?? sliderValue;
      const isPlaying = !!id && (typeof playing.playingState === 'number' ? playing.playingState === 2 :
        playButton?.classList.contains('play-pause-btn') || /pause|暂停/i.test(playLabel));
      // While paused the restore record may be the only authoritative position.
      // Once the active player reports its own progress, use that timeline.
      const usingRestore = restoredPosition !== undefined && !(isPlaying && nativePosition !== undefined);
      const position = clamp(usingRestore ? restoredPosition : nativePosition ?? sample ?? 0, 0, duration);
      const cover = playing.resourceCoverUrl || track.album?.picUrl || track.al?.picUrl || '';
      const hasDispatch = !!cache?.[8]?.exports?.a?.app && typeof currentStore?.dispatch === 'function';
      const canBridge = typeof bridge() === 'function';
      const songId = String(playing.onlineResourceId || track.id || id);
      const isSong = !!playing.curTrack && !/voice/i.test(playing.resourceType || '');
      const queueEditable = isSong && hasDispatch && !!state?.playingList && !['playFm', 'playAi'].includes(playing.playingMode);
      const player = cache?.[4]?.exports?.AudioPlayer;
      const audioAvailable = typeof cache?.[148]?.exports?.a?.subscribe === 'function' &&
        typeof player?.subscribeAudioData === 'function' && typeof player?.setAudioDataEnableState === 'function';
      const quality = id && number(playing.resourcePlayingQuality) !== undefined ? cache?.[41]?.exports?.e?.(playing.resourcePlayingQuality) : undefined;
      const currentEntry = playing.curPlaying || {};
      return {
        id, playId, duration, position,
        audioReceipt: !usingRestore && audioProgress && audioProgress === latestProgress ? progressReceipt : 0,
        hasAudioStream: !!playId && typeof audio?.e?.subscribe === 'function' && !usingRestore,
        songId: isSong && /^\d+$/.test(songId) ? songId : '',
        track, artistItems: playing.resourceArtists || track.artists || track.ar || [],
        albumItem: track.album || track.al || {},
        aliases: track.alias || [], translatedNames: track.transNames || track.tns || [],
        quality: quality?.tagName || quality?.label || '',
        queueSource: currentEntry.text || currentEntry.fromInfo?.sourceData?.name || '',
        queueSourceHref: currentEntry.href || '',
        confirmedPosition: restoredPosition !== undefined || nativePosition !== undefined,
        resourceId: String(playing.curPlaying?.resourceId || ''),
        name: id ? playing.resourceName || track.name || '' : '',
        artist: id ? artists(playing.resourceArtists || track.artists || track.ar) || playing.resourceRadioName || '' : '',
        album: id ? track.album?.name || track.al?.name || '' : '',
        cover: id && typeof cover === 'string' ? cover.replace(/^http:/i, 'https:') : '',
        speed: clamp(number(playing.playingSpeedTrack) || 1, .1, 4),
        playing: isPlaying,
        loading: !!id && !usingRestore && playing.isLoadingFirst === true,
        restored: usingRestore || !playId,
        volume: clamp(number(playing.playingVolume) ?? 0, 0, 1),
        liked: favorite?.getAttribute('aria-pressed') === 'true' || favorite?.classList.contains('loved') ||
          /取消(?:喜欢|收藏)|已(?:喜欢|收藏)|liked|unlike/i.test(likeLabel),
        mode: playing.playingMode || '', modeIcon, modeIconMarkup: modeIcon?.outerHTML,
        queue: Array.isArray(state?.playingList?.curPlayingList) ? state.playingList.curPlayingList : [],
        can: {
          play: available(playButton), previous: available(control('previous')), next: available(control('next')),
          favorite: !!id && available(favorite), mode: available(modeButton),
          queue: available(control('queue')), cover: available(control('cover')),
          seek: !!id && duration > 0 && (hasDispatch || canBridge), volume: hasDispatch || canBridge,
          navigate: hasDispatch && !replacementEnabled(), metadataNav: hasDispatch && !!state?.['async:action'],
          addPlaylist: !!id && isSong && hasDispatch && !!state?.['async:action'] &&
            typeof cache?.[31]?.exports?.default?.openModal === 'function' && typeof cache?.[31]?.exports?.default?.closeModel === 'function',
          queuePlay: hasDispatch && !!state?.['async:action'],
          external: typeof cache?.[4]?.exports?.Os?.openExternal === 'function' || canBridge,
          queueEdit: queueEditable, queueNext: queueEditable && ['playOrder', 'playCycle'].includes(playing.playingMode),
          audioAnalysis: audioAvailable,
        },
      };
    }

    function send(action, payload) {
      const helper = modules()?.[8]?.exports?.a;
      const currentStore = findStore();
      if (!helper?.app || typeof currentStore?.dispatch !== 'function') return false;
      currentStore.dispatch({ type: 'playing/' + action, payload });
      return true;
    }

    function orderedQueue() {
      const list = findStore()?.getState()?.playingList?.curPlayingList;
      return Array.isArray(list) ? list.map((entry, index) => ({ entry, index })).filter(item => item.entry)
        .sort((a, b) => (number(a.entry.displayOrder) ?? a.index) - (number(b.entry.displayOrder) ?? b.index))
        .map(item => item.entry) : [];
    }

    function queueRevision() {
      return orderedQueue().map(entry => entry.resourceId + '|' + (entry.resourceType || 'track')).join('\n');
    }

    function queueMatch(list, id, type) {
      const matches = list.filter(entry => String(entry.resourceId) === id && String(entry.resourceType || 'track') === type);
      return matches.length === 1 ? matches[0] : undefined;
    }

    function dispatchAction(actionId, data, eventType) {
      const currentStore = findStore();
      if (!modules()?.[8]?.exports?.a?.app || typeof currentStore?.dispatch !== 'function') return false;
      currentStore.dispatch({ type: 'async:action/doAction', payload: { actionId, data, eventType } });
      return true;
    }

    function invoke(name, operation) {
      try {
        return operation();
      } catch (error) {
        console.warn('[AppleNowPlaying] 网易云操作失败：' + name, error);
        return false;
      }
    }

    return {
      read,
      trackId: () => getId(findStore()?.getState()?.playing || {}),
      coverEntry: () => control('cover'),
      replacePage(enabled, onOpen) {
        // Verified native module 29/62: every vinyl helper enters this state stream.
        const native = modules()?.[29]?.exports;
        const stream = native?.d, states = native?.a;
        if (typeof stream?.next !== 'function' || typeof stream?.getValue !== 'function' ||
            states?.opening !== 'opening' || states?.closed !== 'closed') return;
        const original = stream.next;
        const descriptor = Object.getOwnPropertyDescriptor(stream, 'next');
        let installed = true;
        function release() {
          if (!installed) return;
          installed = false;
          release.active = false;
          if (stream.next === redirect) {
            if (descriptor) Object.defineProperty(stream, 'next', descriptor);
            else delete stream.next;
          }
          document.body.classList.remove('apple-now-playing-replace-native');
        }
        function redirect(value) {
          if (!installed || !enabled()) { release(); return original.call(this, value); }
          if (value === states.opening || value === states.opened) {
            if (onOpen()) return;
            // If mounting fails, preserve the host's usable fallback.
            release();
          }
          return original.call(this, value);
        }
        try { stream.next = redirect; } catch (_) { return; }
        release.active = true;
        document.body.classList.add('apple-now-playing-replace-native');
        if (stream.getValue() !== states.closed) {
          original.call(stream, states.closed);
          queueMicrotask(() => { if (installed && enabled()) onOpen(); });
        }
        return release;
      },
      watch(callback, onProgress) {
        changeListener = callback;
        progressListener = onProgress;
        return () => {
          changeListener = progressListener = undefined;
          storeOff?.();
          progressSubscription?.unsubscribe();
          watchedStore = storeOff = progressStream = progressSubscription = latestProgress = undefined;
        };
      },
      click(name) {
        return invoke(name, () => {
          const target = control(name);
          if (!available(target)) return false;
          if (name === 'cover') {
            target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey: true, view: window }));
          } else {
            target.click();
          }
          return true;
        });
      },
      seek(id, seconds) {
        return invoke('seek', () => {
          const playing = findStore()?.getState()?.playing || {};
          if (!id || getId(playing) !== id) return false;
          if (send('setPlayingPosition', { duration: seconds })) return true;
          const call = bridge();
          if (!call) return false;
          call('audioplayer.seek', () => {}, [playing.playId || id, id + '|seek|' + ++seekSequence, seconds]);
          return true;
        });
      },
      canFetchPublicQQLyrics() {
        return typeof modules()?.[4]?.exports?.Network?.fetch === 'function';
      },
      fetchPublicQQLyrics(value, signal) {
        if (signal?.aborted) return Promise.reject(new Error('Cancelled'));
        const url = new URL(value);
        const allowed = url.hostname === 'c.y.qq.com' &&
          ['/soso/fcgi-bin/client_search_cp', '/lyric/fcgi-bin/fcg_query_lyric_new.fcg'].includes(url.pathname) ||
          url.hostname === 'u.y.qq.com' && url.pathname === '/cgi-bin/musicu.fcg';
        if (url.protocol !== 'https:' || url.username || url.password || url.port || !allowed) return Promise.reject(new Error('Unsupported lyric endpoint'));
        const network = modules()?.[4]?.exports?.Network;
        if (typeof network?.fetch !== 'function') return Promise.reject(new Error('Native lyric HTTP is unavailable'));
        // Host-owned read-only HTTP avoids executing remote JSONP under the
        // renderer's CSP. Provider code validates and parses the returned JSON.
        return network.fetch({ url: url.href, method: 'GET', headers: { Referer: 'https://y.qq.com/' },
          retryCount: 0, isDecrypt: false, isXeapi: false, shouldIncludeHeaders: false });
      },
      async fonts() {
        try {
          const api = modules()?.[4]?.exports?.Os;
          if (typeof api?.getSystemFonts !== 'function') return [];
          const result = await api.getSystemFonts();
          return Array.isArray(result) ? [...new Set(result.filter(name => typeof name === 'string' && name.trim()))].sort((a, b) => a.localeCompare(b)) : [];
        } catch (_) {
          return [];
        }
      },
      watchAudio(onData, onStatus) {
        const stream = modules()?.[148]?.exports?.a;
        const player = modules()?.[4]?.exports?.AudioPlayer;
        if (typeof stream?.subscribe !== 'function' || typeof player?.subscribeAudioData !== 'function' ||
            typeof player?.setAudioDataEnableState !== 'function') {
          onStatus('当前宿主没有可用分析通道，背景保持常规');
          return () => {};
        }
        const original = player.subscribeAudioData;
        const descriptor = Object.getOwnPropertyDescriptor(player, 'subscribeAudioData');
        let owned = false, subscription, failed = false;
        function release(handoff = false) {
          if (!owned) return;
          owned = false;
          if (player.subscribeAudioData === handoffSubscription) {
            if (descriptor) Object.defineProperty(player, 'subscribeAudioData', descriptor);
            else delete player.subscribeAudioData;
          }
          try { subscription?.unsubscribe(); } catch (_) {}
          if (!handoff) {
            try { Promise.resolve(player.setAudioDataEnableState(false)).catch(() => {}); } catch (_) {}
          }
        }
        function handoffSubscription(...args) {
          // This native channel accepts one callback. Give it back before a
          // host effect registers, rather than replacing or blocking that effect.
          release(true);
          onStatus('宿主正在使用分析通道，背景保持常规');
          return original.apply(this, args);
        }
        try {
          subscription = stream.subscribe({
            next: packets => { if (owned) onData(packets); },
            error: () => {
              failed = true;
              release();
              onStatus('当前分析通道不可用，背景保持常规');
            },
          });
          if (failed || subscription.closed) return () => {};
          owned = true;
          player.subscribeAudioData = handoffSubscription;
          Promise.resolve(player.setAudioDataEnableState(true)).catch(() => {
            if (!owned) return;
            release();
            onStatus('当前无法启用宿主分析，背景保持常规');
          });
          onStatus('正在等待宿主分析数据');
        } catch (_) {
          release();
          onStatus('当前分析通道不可用，背景保持常规');
        }
        return () => release();
      },
      queueRevision,
      mutateQueue(action, id, type, targetId, targetType, revision, after = false) {
        return invoke('queueEdit', () => {
          const latest = read();
          if (!latest.can.queueEdit) return false;
          const list = orderedQueue();
          const entry = queueMatch(list, id, type);
          if (!entry || !['track', 'localTrack', 'downloadTrack'].includes(type)) return false;
          const index = list.indexOf(entry);
          if (action === 'remove') {
            return dispatchAction('removeFromPlayingList', {
              resource: entry, resourceType: 'track', from: { scene: 'playingList' },
            }, 'click');
          }
          let boundary;
          if (action === 'up') boundary = index - 1;
          if (action === 'down') boundary = index + 2;
          if (action === 'next') {
            if (!latest.can.queueNext) return false;
            const current = list.findIndex(item => String(item.resourceId) === latest.resourceId);
            if (current < 0 || current === index || index === current + 1) return false;
            boundary = current + 1;
          }
          if (action === 'drop') {
            if (revision !== queueRevision()) return false;
            const target = queueMatch(list, targetId, targetType);
            if (!target || target === entry) return false;
            boundary = list.indexOf(target) + (after ? 1 : 0);
          }
          if (!Number.isInteger(boundary) || boundary < 0 || boundary > list.length || boundary === index || boundary === index + 1) return false;
          // The native sort model owns ordering and randomOrder. Its normal
          // next/previous path resolves the current resource from the new list.
          findStore().dispatch({
            type: 'playingList/sortPlayingList',
            payload: { trackList: [entry], options: { offset: boundary } },
          });
          return true;
        });
      },
      openExternal(url) {
        return invoke('external', () => {
          if (!/^https?:\/\//.test(url || '')) return false;
          const api = modules()?.[4]?.exports?.Os;
          if (typeof api?.openExternal === 'function') {
            Promise.resolve(api.openExternal(url)).catch(error => console.warn('[AppleNowPlaying] 无法打开外部链接', error));
            return true;
          }
          const call = bridge();
          if (!call) return false;
          call('os.navigateExternal', () => {}, [url]);
          return true;
        });
      },
      navigate(id, kind, resource) {
        return invoke('navigate', () => {
          const playing = findStore()?.getState()?.playing;
          if (!playing || getId(playing) !== id) return false;
          if (kind === 'song') return send('openVinylPage', {});
          if (!resource?.id || !['artist', 'album'].includes(kind)) return false;
          return dispatchAction('link', { resource, resourceType: kind });
        });
      },
      playlistOverlay(container, callbacks) {
        const service = modules()?.[31]?.exports?.default;
        const toast = modules()?.[3]?.exports?.L;
        if (typeof service?.openModal !== 'function' || typeof service?.closeModel !== 'function') return;
        const original = service.openModal;
        const descriptor = Object.getOwnPropertyDescriptor(service, 'openModal');
        const originalToast = toast?.create;
        const toastDescriptor = toast && Object.getOwnPropertyDescriptor(toast, 'create');
        const dialogs = new Set(), movedToasts = new Map();
        let active = true, seenFavourite = false;
        function moveToast() {
          const id = toast?.getWrapperId?.();
          const node = id && document.getElementById(id);
          if (!node || node.parentNode === container) return;
          const pointer = getComputedStyle(node).pointerEvents;
          movedToasts.set(node, { parent: node.parentNode, next: node.nextSibling,
            pointer: node.style.getPropertyValue('pointer-events'), priority: node.style.getPropertyPriority('pointer-events'), appliedPointer: pointer });
          node.style.setProperty('pointer-events', pointer);
          container.append(node);
          callbacks.toast();
        }
        function createToast(...args) {
          const value = originalToast.apply(this, args);
          if (active) moveToast();
          return value;
        }
        function openModal(request, ...args) {
          const owned = request?.comName === 'FavouriteModal' ||
            (seenFavourite && request?.comName === 'CreatePlaylistModal');
          if (!active || !owned) return original.call(this, request, ...args);
          if (request.comName === 'FavouriteModal') seenFavourite = true;
          const token = { name: request.comName };
          const afterClose = request.modalProps?.afterClose;
          dialogs.add(token);
          callbacks.open(token);
          const routed = { ...request, modalProps: { ...request.modalProps,
            getPopupContainer: () => container,
            afterClose(...values) {
              try { afterClose?.apply(this, values); }
              finally {
                if (dialogs.delete(token) && active) callbacks.close(token);
              }
            },
          } };
          try { return original.call(this, routed, ...args); }
          catch (error) {
            if (dialogs.delete(token) && active) callbacks.close(token);
            throw error;
          }
        }
        try {
          service.openModal = openModal;
          if (typeof originalToast === 'function') toast.create = createToast;
        } catch (_) {
          if (service.openModal === openModal) {
            if (descriptor) Object.defineProperty(service, 'openModal', descriptor);
            else delete service.openModal;
          }
          return;
        }
        return {
          release(cancel = false) {
            if (!active) return;
            active = false;
            if (service.openModal === openModal) {
              if (descriptor) Object.defineProperty(service, 'openModal', descriptor);
              else delete service.openModal;
            }
            if (toast?.create === createToast) {
              if (toastDescriptor) Object.defineProperty(toast, 'create', toastDescriptor);
              else delete toast.create;
            }
            if (cancel) {
              for (const name of new Set([...dialogs].map(token => token.name))) {
                try { service.closeModel({ mode: 'comModal', comName: name, isForce: true }); } catch (_) {}
              }
            }
            dialogs.clear();
            for (const [node, position] of movedToasts) {
              if (node.style.getPropertyValue('pointer-events') === position.appliedPointer) {
                if (position.pointer) node.style.setProperty('pointer-events', position.pointer, position.priority);
                else node.style.removeProperty('pointer-events');
              }
              if (!node.isConnected || node.parentNode !== container || !position.parent?.isConnected) continue;
              position.parent.insertBefore(node, position.next?.parentNode === position.parent ? position.next : null);
            }
            movedToasts.clear();
          },
        };
      },
      addToPlaylist(id) {
        return invoke('playlist', () => {
          const playing = findStore()?.getState()?.playing;
          if (!playing || getId(playing) !== id || !playing.curTrack || /voice/i.test(playing.resourceType || '')) return false;
          return dispatchAction('favorite', {
            resource: playing.curTrack, resourceType: 'track', from: { scene: 'vinyl' },
          });
        });
      },
      playQueue(resourceId, resourceType) {
        return invoke('queuePlay', () => {
          const state = findStore()?.getState();
          const matches = (state?.playingList?.curPlayingList || []).filter(item =>
            String(item.resourceId) === resourceId && String(item.resourceType || 'track') === resourceType);
          if (matches.length !== 1) return false;
          return dispatchAction('play', {
            resource: matches[0], resourceType: 'track', from: { scene: 'playingList' },
          }, 'dbClick');
        });
      },
      volume(value) {
        return invoke('volume', () => {
          value = clamp(value, 0, 1);
          if (send('setVolume', { volume: value })) return true;
          const call = bridge();
          if (!call) return false;
          call('audioplayer.setVolume', () => {}, ['', '', value]);
          return true;
        });
      },
    };
  }

  function parseLrc(raw, includeEmpty = false) {
    const lines = new Map();
    const offset = Number(raw?.match(/\[offset:([+-]?\d+)\]/i)?.[1]) || 0;
    for (const line of (raw || '').split(/\r?\n/)) {
      const tags = [...line.matchAll(/\[(\d+):(\d{1,2})(?:[.:](\d{1,3}))?\]/g)];
      if (!tags.length) continue;
      const content = line.slice(tags[tags.length - 1].index + tags[tags.length - 1][0].length).trim();
      if (!content && !includeEmpty) continue;
      for (const [, min, sec, fraction] of tags) {
        const time = Math.max(0, +min * 60000 + +sec * 1000 + Number((fraction || '').padEnd(3, '0')) - offset);
        lines.set(time, content);
      }
    }
    return lines;
  }

  function nearestText(entries, time) {
    if (entries.has(time)) return entries.get(time);
    let closest = '', distance = 550;
    for (const [stamp, value] of entries) {
      if (Math.abs(stamp - time) < distance) {
        closest = value;
        distance = Math.abs(stamp - time);
      }
    }
    return closest;
  }

  function parseYrcWords(raw) {
    const synced = new Map();
    for (const line of (raw || '').split(/\r?\n/)) {
      const start = line.match(/^\[(\d+),(\d+)\]/);
      if (!start) continue;
      const words = [...line.matchAll(/\((\d+),(\d+),-?\d+\)(.*?)(?=\(\d+,\d+,-?\d+\)|$)/g)]
        .map(([, time, duration, word]) => ({ time: +time, duration: +duration, text: word }));
      const content = words.map(word => word.text).join('').trim();
      if (content && words.some(word => word.duration > 0 && word.text.trim())) {
        synced.set(+start[1], { content, words, end: +start[1] + +start[2] });
      }
    }
    return synced;
  }

  function parseNativeLyrics(payload, preferWords) {
    const original = parseLrc(payload.lrc?.lyric, true);
    const translated = parseLrc(payload.tlyric?.lyric);
    const wordTranslations = parseLrc(payload.ytlrc?.lyric);
    const roman = parseLrc(payload.romalrc?.lyric);
    const wordRoman = parseLrc(payload.yromalrc?.lyric);
    const synced = parseYrcWords(payload.yrc?.lyric);
    const timedRoman = parseYrcWords(payload.yromalrc?.lyric);
    const originalCount = [...original.values()].filter(Boolean).length;
    const usingYrc = preferWords && synced.size > 0 && synced.size >= originalCount * .7;
    if (!usingYrc && !originalCount) return [];
    return [...(usingYrc ? synced : original).entries()].sort(([a], [b]) => a - b).map(([time, row]) => {
      let content = typeof row === 'string' ? row : row.content;
      const words = row.words || [];
      const reading = usingYrc && nearestText(timedRoman, time);
      const backing = content.match(/^(?:\((.+)\)|（(.+)）)$/);
      let translation = (usingYrc && nearestText(wordTranslations, time)) || nearestText(translated, time) || '';
      if (backing) {
        content = (backing[1] || backing[2]).trim();
        const first = words.find(word => word.text.trim());
        const last = [...words].reverse().find(word => word.text.trim());
        if (first) first.text = first.text.replace(/^\s*[（(]\s*/, '');
        if (last) last.text = last.text.replace(/\s*[）)]\s*$/, '');
        translation = translation.replace(/^\s*[（(](.+)[）)]\s*$/, '$1');
      }
      return {
        time, end: row.end, content, words, translation,
        romanWords: reading?.words,
        roman: reading?.content || (usingYrc && nearestText(wordRoman, time)) || nearestText(roman, time) || '',
        side: backing ? 'right' : 'left', backing: !!backing, backingLines: [],
      };
    });
  }

  const metadataNamespace = 'http://www.w3.org/ns/ttml#metadata';
  const xmlNamespace = 'http://www.w3.org/XML/1998/namespace';
  const roleOf = (element) => element.getAttributeNS(metadataNamespace, 'role');
  const byTag = (element, name) => [...element.getElementsByTagNameNS('*', name)];

  function ttmlTime(value) {
    if (!value) return NaN;
    if (/^\d+(?:\.\d+)?ms$/.test(value)) return parseFloat(value);
    if (/^\d+(?:\.\d+)?s?$/.test(value)) return parseFloat(value) * 1000;
    if (!/^(?:\d+:){1,2}\d{1,2}(?:\.\d+)?$/.test(value)) return NaN;
    return value.split(':').reduce((seconds, part) => seconds * 60 + Number(part), 0) * 1000;
  }

  function preferredTtmlText(entries) {
    const present = entries.filter(entry => entry.content);
    return present.find(entry => /^zh(?:-|$)/i.test(entry.lang || '')) || present[0];
  }

  const ttmlRubyRole = element => element.getAttributeNS('http://www.w3.org/ns/ttml#styling', 'ruby');

  function readRubyWord(container, fallbackTiming) {
    const children = Array.from(container.children);
    const base = children.find(element => ttmlRubyRole(element) === 'base');
    if (!base) return;
    const text = base.textContent.replace(/\s+/g, ' ');
    const ruby = [];
    for (const part of byTag(container, 'span')) {
      if (ttmlRubyRole(part) !== 'text') continue;
      const word = part.textContent.trim();
      const startTime = ttmlTime(part.getAttribute('begin'));
      const endTime = ttmlTime(part.getAttribute('end'));
      if (word && endTime > startTime) ruby.push({ word, startTime, endTime });
    }
    if (!ruby.length) return { ...fallbackTiming, text };
    const time = Math.min(...ruby.map(part => part.startTime));
    return { text, time, duration: Math.max(...ruby.map(part => part.endTime)) - time, ruby };
  }

  function readTtmlText(container, explicitTiming = false) {
    const words = [];
    let content = '';
    let previousTiming;
    function read(node, timing) {
      if (node.nodeType === Node.TEXT_NODE) {
        const raw = node.nodeValue;
        const value = raw.trim() ? raw.replace(/\s+/g, ' ') : raw.includes('\n') ? '' : raw;
        content += value;
        if (value) {
          if (explicitTiming && words.length && timing === previousTiming) words[words.length - 1].text += value;
          else words.push({ ...(timing || {}), text: value });
          previousTiming = timing;
        }
      } else if (node.nodeType === Node.ELEMENT_NODE && !roleOf(node)) {
        const time = ttmlTime(node.getAttribute('begin'));
        const end = ttmlTime(node.getAttribute('end'));
        let interval = end > time ? { time, duration: end - time } : timing;
        if (!explicitTiming && ttmlRubyRole(node) === 'container') {
          const word = readRubyWord(node, interval);
          if (word) {
            content += word.text;
            words.push(word);
            return;
          }
        }
        if (explicitTiming && (node.hasAttribute('begin') || node.hasAttribute('end') || node.hasAttribute('dur'))) {
          const duration = node.hasAttribute('end') ? end - time : ttmlTime(node.getAttribute('dur'));
          interval = Number.isFinite(time) && Number.isFinite(duration) && duration > 0 ? { time, duration } : undefined;
        }
        node.childNodes.forEach(child => read(child, interval));
      }
    }
    container.childNodes.forEach(child => read(child));
    return { content: content.trim(), words: words.some(word => word.duration > 0) ? words : [] };
  }

  function readTtmlRomanization(container) {
    const { content, words } = readTtmlText(container, true);
    // The enclosing romanization element can time a whole line. Only its
    // explicitly timed descendants can provide the finer-grained time axis.
    if (!words.length) return { content };
    let previousStart = -Infinity;
    for (const word of words) {
      if (!word.text.trim()) continue;
      if (!(word.duration > 0) || word.time < previousStart) return { content };
      previousStart = word.time;
    }
    return { content, words: words.map(({ time = 0, duration = 0, text }) => ({ time, duration, text })) };
  }

  function parseTtml(raw) {
    const xml = new DOMParser().parseFromString(raw, 'application/xml');
    if (xml.getElementsByTagName('parsererror').length || xml.documentElement?.localName !== 'tt') return [];
    const head = byTag(xml, 'head')[0];
    const body = byTag(xml, 'body')[0];
    if (!body) return [];
    const sidecars = new Map();
    for (const type of ['translation', 'transliteration']) {
      const read = type === 'transliteration' ? readTtmlRomanization : element => ({ content: readTtmlText(element).content });
      for (const group of head ? byTag(head, type) : []) {
        for (const row of byTag(group, 'text')) {
          const key = row.getAttribute('for');
          if (!key) continue;
          if (!sidecars.has(key)) sidecars.set(key, []);
          sidecars.get(key).push({
            type,
            lang: group.getAttributeNS(xmlNamespace, 'lang'),
            text: read(row),
            backing: byTag(row, 'span').filter(span => roleOf(span) === 'x-bg').map(read),
          });
        }
      }
    }
    function sideText(line, role, extra, type, backingIndex) {
      const isRoman = role === 'x-roman';
      const inline = [...line.children].filter(span => roleOf(span) === role).map(span => ({
        lang: span.getAttributeNS(xmlNamespace, 'lang'),
        ...(isRoman ? readTtmlRomanization(span) : { content: span.textContent.trim() }),
      }));
      const sidecar = extra.filter(entry => entry.type === type).map(entry => ({
        lang: entry.lang, ...(backingIndex === undefined ? entry.text : entry.backing[backingIndex]),
      }));
      const entries = [...inline, ...sidecar];
      const selected = preferredTtmlText(entries);
      if (isRoman && selected && !selected.words) {
        const lang = (selected.lang || '').toLowerCase();
        return entries.find(entry => {
          const entryLang = (entry.lang || '').toLowerCase();
          return entry.words && entry.content === selected.content && (!lang || !entryLang || entryLang === lang);
        }) || selected;
      }
      return selected;
    }
    function supplementalText(line, extra, backingIndex) {
      const translation = sideText(line, 'x-translation', extra, 'translation', backingIndex);
      const roman = sideText(line, 'x-roman', extra, 'transliteration', backingIndex);
      return { translation: translation?.content || '', roman: roman?.content || '', romanWords: roman?.words };
    }
    function vocal(element, fallbackStart, fallbackEnd) {
      const result = readTtmlText(element);
      const timed = result.words.filter(word => word.duration > 0 && Number.isFinite(word.time));
      const start = ttmlTime(element.getAttribute('begin'));
      const end = ttmlTime(element.getAttribute('end'));
      return {
        ...result,
        time: Number.isFinite(start) ? start : timed[0]?.time ?? fallbackStart,
        end: Number.isFinite(end) ? end : timed.length ? Math.max(...timed.map(word => word.time + word.duration)) : fallbackEnd,
      };
    }
    const agents = head ? byTag(head, 'agent').filter(agent => agent.getAttribute('type') === 'person') : [];
    const firstAgent = agents[0]?.getAttributeNS(xmlNamespace, 'id') || 'v1';
    const lines = [];
    for (const line of byTag(body, 'p')) {
      const time = ttmlTime(line.getAttribute('begin'));
      if (!Number.isFinite(time)) continue;
      const agent = line.getAttributeNS(metadataNamespace, 'agent') || line.parentElement?.getAttributeNS(metadataNamespace, 'agent');
      const side = agent && agent !== firstAgent && agent !== 'v1000' ? 'right' : 'left';
      const key = [...line.attributes].find(attribute => attribute.localName === 'key')?.value;
      const extra = sidecars.get(key) || [];
      const main = vocal(line, time, undefined);
      const backingLines = [...line.children].filter(span => roleOf(span) === 'x-bg').map((span, index) => ({
        ...vocal(span, time, main.end),
        ...supplementalText(span, extra, index),
        side, backing: true,
      })).filter(row => row.content);
      if (main.content || backingLines.length) {
        lines.push({
          ...main, time, side, agent, backing: false, backingLines,
          ...supplementalText(line, extra),
        });
      }
    }
    return lines.sort((a, b) => a.time - b.time);
  }

  function mergeLyricSidecars(rows, native) {
    const normalized = value => (value || '').replace(/[\s，。！？、,.!?（）()「」…〜~]/g, '');
    const candidates = new Map();
    for (const line of native) {
      const key = normalized(line.content);
      if (!key) continue;
      if (!candidates.has(key)) candidates.set(key, []);
      candidates.get(key).push(line);
    }
    function merge(line) {
      const matches = candidates.get(normalized(line.content)) || [];
      let closest, distance = 1000;
      for (const candidate of matches) {
        const delta = Math.abs(candidate.time - line.time);
        if (delta <= distance) {
          closest = candidate;
          distance = delta;
        }
      }
      const compatibleReading = closest?.romanWords?.length &&
        (!line.roman || normalized(line.roman).toLowerCase() === normalized(closest.roman).toLowerCase());
      const romanWords = line.romanWords?.length ? line.romanWords : compatibleReading ?
        closest.romanWords.map(w => ({ ...w, time: w.time + line.time - closest.time })) : undefined;
      return {
        ...line, romanWords, translation: line.translation || closest?.translation || '',
        roman: line.roman || closest?.roman || '',
      };
    }
    return rows.map(line => ({ ...merge(line), backingLines: (line.backingLines || []).map(merge) }));
  }

  function prepareLyrics(rows, duration) {
    const result = [];
    let lastEnd = 0, explicitEnd = true;
    const addInterlude = (start, end) => {
      if (explicitEnd && end - start >= 7000) {
        result.push({ kind: 'interlude', time: start, end, key: 'gap-' + start, words: [], backingLines: [] });
      }
    };
    rows.forEach((row, index) => {
      if (!row.content && !row.backingLines?.length) {
        lastEnd = Math.max(lastEnd, row.time);
        explicitEnd = true;
        return;
      }
      if (row.time >= lastEnd) addInterlude(lastEnd, row.time);
      // QRC/TTML containers can last until the next sentence although their
      // timed singing has already ended. Use real word tails for gap detection.
      const withVocalTiming = vocal => {
        const timed = vocal.words.filter(word => word.duration > 0);
        return {
          ...vocal,
          vocalStart: timed.length ? Math.min(...timed.map(word => word.time)) : vocal.time,
          vocalEnd: timed.length ? Math.max(...timed.map(word => word.time + word.duration)) : vocal.end ?? vocal.time,
        };
      };
      const backingLines = (row.backingLines || []).map(withVocalTiming);
      const main = withVocalTiming(row);
      const end = Math.max(main.vocalEnd, ...backingLines.map(vocal => vocal.vocalEnd));
      const audibleStart = Math.min(main.vocalStart, ...backingLines.map(vocal => vocal.vocalStart));
      result.push({ ...main, backingLines, sourceEnd: row.end, kind: 'line', key: 'line-' + row.time + '-' + index, end, audibleStart,
        explicitEnd: Number.isFinite(row.end) || row.words.some(word => word.duration > 0) });
      lastEnd = Math.max(lastEnd, end);
      explicitEnd = Number.isFinite(row.end) || row.words.some(word => word.duration > 0);
    });
    if (result.length) addInterlude(lastEnd, duration * 1000);
    return result.sort((a, b) => a.time - b.time);
  }

  async function requestLyrics(url, parent, timeout, read, cache, customSource = false) {
    const controller = new AbortController();
    const cancel = () => controller.abort();
    parent.signal.addEventListener('abort', cancel, { once: true });
    if (parent.signal.aborted) cancel();
    const timer = setTimeout(cancel, timeout);
    try {
      const options = { signal: controller.signal, cache };
      if (customSource) {
        options.credentials = 'omit';
        options.referrerPolicy = 'no-referrer';
      }
      const response = await fetch(url, options);
      if (!response.ok) return { missing: response.status === 404 };
      return { data: await read(response) };
    } catch (_) {
      return {};
    } finally {
      clearTimeout(timer);
      parent.signal.removeEventListener('abort', cancel);
    }
  }

  const host = makeHost();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let takeover = storedValue(takeoverKey) !== 'off';
  let lyricSource = '打开播放页后加载';
  let lyricSettings, manualLyricRefresh;
  let page, launcher, view, snapshot, pageStyle, entryObserver, replacementOff;
  const lifetime = new AbortController();
  let activity, frame, unwatchHost, lyricResize;
  let dirty = true, sampleAt = 0;
  let backdropIndex = 0, paletteImage, coverKey;
  let lyrics = [], lyricRequest, lyricTrackId, restartLyrics = false;
  let lyricFocus = -1, browseUntil = 0;
  let tab = 'lyrics';
  let queueReference, queueCurrent;
  let clock, displayed = 0, pendingSeek, deferredSeek, seekAlignment;
  let drag, dragEndTimer, pendingVolume, volumeGesture, volumeQueued, volumeTimer;
  let volumeSentAt = -Infinity;
  let ignoreFallbackPosition;
  let focusBeforeOpen;
  let lyricView, queueView, rawLyrics = [];
  let queueRows = [], metadataSignature = '';
  let details, detailRequest, detailTrackId;
  let previewPosition, copyMode = false, copyAnchor, rowMenuIndex = -1;
  let previewView, previewRow, previewOptions;
  let popupFocus, toastTimer, pageTransition, closing = false, nativeDialog, coverSaveRequest;
  let settingsOpen = false, settingsAnimation;
  let panelPositions = {}, controlsHidden = false, panelSlide, panelFade;
  let fluidRenderer, audioOff, audioTrack, audioStatus = '音频律动已关闭';
  let audioTarget = 0, audioPulse = 0, audioStamp = 0, audioVisualAt = 0;
  let lowPass = 0, lowEnvelope = 0;
  let lyricDetails = { contributors: [], metadata: [], supplements: [] };
  let fontRequest = 0, fontsLoaded = false, queueMenuTarget, queueDrag, dropdown;
  let dropdownSequence = 0;
  const narrowWindow = matchMedia('(max-width: 800px), (max-height: 400px)');

  function mount() {
    const style = document.createElement('style');
    style.textContent = "/* src/styles/index.css */\n@property --anp-extspotify-mask-x { syntax: \"<length>\"; inherits: false; initial-value: 0px; }\n.amll-lyric-player.apple-now-playing-extspotify {\n  width: 100%;\n  height: 100%;\n  overflow: hidden;\n  max-width: 100%;\n  color: var(--amll-lp-color, white);\n  mix-blend-mode: plus-lighter;\n  font-size: var(--amll-lp-font-size, max(max(4.7vh, 3.2vw), 12px));\n}\n.amll-lyric-player.apple-now-playing-extspotify.dom {\n  --amll-lp-line-width-aspect: 0.8;\n  --amll-lp-line-padding-x: 1em;\n  --amll-lp-bg-line-scale: 0.7;\n  user-select: none;\n  box-sizing: content-box;\n  z-index: 1;\n  line-height: 1.2em;\n}\n.amll-lyric-player.apple-now-playing-extspotify.dom:hover .lyric-line {\n  filter: unset !important;\n}\n@media screen and (max-width: 768px) {\n  .amll-lyric-player.apple-now-playing-extspotify {\n    --amll-lp-line-width-aspect: 1;\n    --amll-lp-line-padding-x: 0;\n  }\n}\n.amll-lyric-player.apple-now-playing-extspotify .anp-lyric-column {\n  position: relative;\n  width: 100%;\n  height: 100%;\n}\n.amll-lyric-player.apple-now-playing-extspotify .anp-browsing-column {\n  will-change: transform;\n}\n\n/* src/styles/lyric-player.module.css */\n.lyric_player_lyricLine {\n  position: absolute;\n  backface-visibility: hidden;\n  transform-origin: left;\n  min-width: 0;\n  max-width: 100%;\n  width: 100%;\n  height: fit-content;\n  padding: 2vh 1em;\n  padding-right: 20%;\n  contain: content;\n  will-change: transform;\n  transition:\n    filter 0.2s,\n    background-color 0.25s,\n    box-shadow 0.25s;\n  box-sizing: border-box;\n  border-radius: 0.25em;\n}\n.lyric_player_lyricLine:not(:empty):hover {\n  background-color: var(--amll-lp-hover-bg-color, #fff1);\n}\n.lyric_player_lyricLine:not(:empty):active {\n  background-color: var(--amll-lp-hover-bg-color, #ffffff05);\n}\n.lyric_player_lyricBgLine {\n  opacity: 0;\n  font-size: max(calc(100% * var(--amll-lp-bg-line-scale, 70%)), 10px);\n  transition:\n    opacity 0.25s,\n    scale 0.5s,\n    filter 0.2s,\n    background-color 0.25s,\n    box-shadow 0.25s;\n  padding: 1vh calc(var(--amll-lp-line-padding-x, 1em) / var(--amll-lp-bg-line-scale, 0.7));\n}\n.lyric_player_lyricBgLine.lyric_player_active {\n  transition:\n    opacity 0.5s 0.25s,\n    scale 1.5s cubic-bezier(0, 1, 0, 1) 0.25s,\n    filter 0.2s,\n    background-color 0.25s,\n    box-shadow 0.25s;\n  opacity: 0.4;\n}\n.lyric_player_lyricDuetLine {\n  text-align: right;\n  transform-origin: right;\n  padding-left: 20%;\n  padding-right: 1em;\n}\n.lyric_player_lyricMainLine {\n  transition: opacity 0.3s 0.1s;\n  margin: -1em;\n  padding: 1em;\n}\n.lyric_player_lyricMainLine span {\n  display: inline-block;\n}\n.lyric_player_lyricMainLine > span,\n.lyric_player_lyricMainLine span.lyric_player_emphasizeWrapper {\n  white-space: pre-wrap;\n  display: inline-block;\n  padding: 1em;\n  margin: -1em;\n  will-change: transform;\n}\n:is(.lyric_player_lyricMainLine > span, .lyric_player_lyricMainLine span.lyric_player_emphasizeWrapper).lyric_player_emphasize,\n:is(.lyric_player_lyricMainLine > span, .lyric_player_lyricMainLine span.lyric_player_emphasizeWrapper) span.lyric_player_emphasize {\n  padding: 1em;\n  margin: -1em;\n  backface-visibility: hidden;\n}\n:is(:is(.lyric_player_lyricMainLine > span, .lyric_player_lyricMainLine span.lyric_player_emphasizeWrapper).lyric_player_emphasize, :is(.lyric_player_lyricMainLine > span, .lyric_player_lyricMainLine span.lyric_player_emphasizeWrapper) span.lyric_player_emphasize) > span {\n  padding: 1em;\n  margin: -1em;\n  will-change: transform;\n  backface-visibility: hidden;\n}\n.lyric_player_lyricSubLine {\n  font-size: max(0.5em, 10px);\n  line-height: 1.5em;\n  transition: opacity 0.2s 0.25s;\n  opacity: 0.3;\n}\n.lyric_player_disableSpring > .anp-lyric-column > * {\n  transition:\n    filter 0.25s,\n    transform 0.5s,\n    background-color 0.25s,\n    box-shadow 0.25s;\n}\n.lyric_player_interludeDots {\n  height: clamp(0.5em, 1vh, 3em);\n  transition: opacity 0.25s;\n  transform-origin: center;\n  width: fit-content;\n  padding: 2.5% 0.75em;\n  position: absolute;\n  display: flex;\n  gap: 0.25em;\n  left: 0;\n  opacity: 0;\n}\n.lyric_player_interludeDots.lyric_player_enabled {\n  opacity: 1;\n}\n.lyric_player_interludeDots > * {\n  width: clamp(0.5em, 1vh, 3em);\n  height: clamp(0.5em, 1vh, 3em);\n  display: inline-block;\n  border-radius: 50%;\n  aspect-ratio: 1 / 1;\n  background-color: var(--amll-lp-color, white);\n  margin-right: 4px;\n}\n.lyric_player_interludeDots.lyric_player_duet {\n  right: 0;\n  transform-origin: center;\n}\n@supports (mix-blend-mode: plus-lighter) {\n  .lyric_player_lyricSubLine {\n    opacity: 0.3;\n  }\n}\n.lyric_player_tmpDisableTransition {\n  transition: none !important;\n}\n.anp-browsing-column > .lyric_player_lyricLine {\n  will-change: auto;\n  backface-visibility: visible;\n}\n\n#apple-now-playing-launch {\n  all: unset; box-sizing: border-box; position: fixed; z-index: 9999;\n  bottom: 52px; right: 18px; width: 34px; height: 34px; display: grid;\n  place-items: center; cursor: pointer; color: white; border-radius: 11px;\n  background: #233342; box-shadow: 0 3px 14px #0003;\n}\n#apple-now-playing-launch:hover { background: #3e5568; }\n#apple-now-playing-launch svg { width: 19px; height: 19px; }\n#apple-now-playing-page {\n  position: fixed; inset: 0; z-index: 2147483600; isolation: isolate;\n  --apple-now-playing-gutter: clamp(20px, 5.5vw, 92px);\n  --apple-now-playing-column-gap: clamp(26px, 6vw, 100px);\n  --apple-now-playing-top: clamp(52px, 8vh, 102px);\n  --apple-now-playing-bottom: clamp(58px, 8vh, 102px);\n  --apple-now-playing-controls-space: 286px;\n  --apple-now-playing-cover-max: min(540px, max(146px, calc(100vh - var(--apple-now-playing-top) - var(--apple-now-playing-bottom) - var(--apple-now-playing-controls-space))));\n  display: grid; grid-template-columns: minmax(0, 40fr) minmax(0, 60fr); grid-template-rows: minmax(0, 1fr);\n  align-items: center; gap: var(--apple-now-playing-column-gap);\n  padding: var(--apple-now-playing-top) var(--apple-now-playing-gutter) var(--apple-now-playing-bottom); overflow: hidden;\n  background: transparent; color: var(--apple-now-playing-fg, #fafafa); box-sizing: border-box;\n  border: 0; border-radius: 0; margin: 0; box-shadow: none;\n  font: 600 16px/1.35 \"Segoe UI\", \"Microsoft YaHei UI\", sans-serif;\n  -webkit-app-region: no-drag;\n}\n#apple-now-playing-page[hidden], #apple-now-playing-page [hidden]:where(:not(.apple-now-playing-host-portal *)), #apple-now-playing-launch[hidden] { display: none !important; }\n#apple-now-playing-page :where(:not(.apple-now-playing-host-portal, .apple-now-playing-host-portal *)), #apple-now-playing-page :where(:not(.apple-now-playing-host-portal, .apple-now-playing-host-portal *))::before, #apple-now-playing-page :where(:not(.apple-now-playing-host-portal, .apple-now-playing-host-portal *))::after { box-sizing: border-box; }\n#apple-now-playing-page button:where(:not(.apple-now-playing-host-portal *)) {\n  font: inherit; color: inherit; letter-spacing: inherit; cursor: pointer; padding: 0;\n  border: none; background: transparent; text-align: center;\n}\n#apple-now-playing-page:focus { outline: none; }\n#apple-now-playing-page .apple-now-playing-grip:focus-visible { outline: none !important; }\n#apple-now-playing-page .apple-now-playing-grip:focus-visible::before { box-shadow: 0 0 0 3px var(--apple-now-playing-focus); }\n#apple-now-playing-page button:where(:not(.apple-now-playing-host-portal *)):disabled,\n#apple-now-playing-page [data-action=\"toggle-roman\"].is-line-only { opacity: .35; }\n#apple-now-playing-page button:where(:not(.apple-now-playing-host-portal *)):disabled { cursor: default; }\n#apple-now-playing-page button:where(:not(.apple-now-playing-host-portal *)):focus-visible, #apple-now-playing-page input:where(:not(.apple-now-playing-host-portal *)):focus-visible, #apple-now-playing-launch:focus-visible {\n  outline: 2px solid var(--apple-now-playing-fg); outline-offset: 3px;\n}\n#apple-now-playing-page svg:where(:not(.apple-now-playing-host-portal *)) { display: block; width: 1em; height: 1em; flex: none; }\n#apple-now-playing-page .apple-now-playing-backdrop {\n  position: absolute; inset: -5%; z-index: -1; opacity: 0;\n  background:\n    radial-gradient(ellipse at 2% 63%, var(--apple-now-playing-a, #484848), transparent 73%),\n    radial-gradient(ellipse at 52% 0%, var(--apple-now-playing-b, #585858), transparent 76%),\n    linear-gradient(122deg, var(--apple-now-playing-c, #383838), var(--apple-now-playing-base, #383838));\n}\n#apple-now-playing-page .apple-now-playing-backdrop.on { opacity: 1; }\n#apple-now-playing-page.is-active .apple-now-playing-backdrop {\n  transition: opacity .65s ease;\n}\n#apple-now-playing-page.is-active .apple-now-playing-backdrop:is(.on, .apple-now-playing-fading) {\n  animation: apple-now-playing-drift 38s ease-in-out infinite alternate;\n}\n#apple-now-playing-page .apple-now-playing-backdrop:nth-child(2) { animation-delay: -16s; }\n@keyframes apple-now-playing-drift {\n  from { transform: translate3d(-1.7%, -1%, 0) scale(1.02); }\n  to { transform: translate3d(1.7%, 1.2%, 0) scale(1.07); }\n}\n#apple-now-playing-page[data-panel=\"none\"] { grid-template-columns: minmax(0, 1fr); }\n#apple-now-playing-page[data-panel=\"none\"] .apple-now-playing-right { display: none; }\n#apple-now-playing-page[data-panel=\"none\"] .apple-now-playing-right.is-fading-out {\n  display: flex; position: absolute; z-index: -1; pointer-events: none;\n}\n/* CEF forwards this title-bar region to the native window hit-test. */\n#apple-now-playing-page .apple-now-playing-drag-bar { position: absolute; top: 0; left: 0; right: 0; height: clamp(44px, 7vh, 64px); z-index: 1; -webkit-app-region: drag; }\n#apple-now-playing-page button:where(:not(.apple-now-playing-host-portal *)), #apple-now-playing-page input:where(:not(.apple-now-playing-host-portal *)), #apple-now-playing-page select:where(:not(.apple-now-playing-host-portal *)), #apple-now-playing-page textarea:where(:not(.apple-now-playing-host-portal *)) { -webkit-app-region: no-drag; }\n#apple-now-playing-page:fullscreen .apple-now-playing-drag-bar { -webkit-app-region: no-drag; pointer-events: none; }\n#apple-now-playing-page .apple-now-playing-window-tools { position: absolute; top: 2.4vh; right: 2.8vw; z-index: 2; display: flex; gap: 12px; align-items: center; }\n#apple-now-playing-page .apple-now-playing-window-tools .apple-now-playing-icon { position: static; color: var(--apple-now-playing-muted); }\n#apple-now-playing-page .apple-now-playing-settings-button > svg { transform: scale(1.2); }\n#apple-now-playing-page .apple-now-playing-queue-toggle { color: var(--apple-now-playing-muted); }\n#apple-now-playing-page .apple-now-playing-queue-toggle[aria-pressed=\"true\"] { background: var(--apple-now-playing-selected); color: var(--apple-now-playing-selected-ink); }\nbody.apple-now-playing-replace-native #vinyl-page-container { display: none !important; }\n#apple-now-playing-page .apple-now-playing-grip {\n  position: absolute; z-index: 2; top: 2.1vh; left: 50%; transform: translateX(-50%);\n  width: 76px; height: 32px; display: grid; place-items: center;\n}\n#apple-now-playing-page .apple-now-playing-grip::before {\n  content: \"\"; width: 92%; height: 8px; background: var(--apple-now-playing-grip); border-radius: 999px;\n}\n#apple-now-playing-page .apple-now-playing-grip:hover::before { background: var(--apple-now-playing-muted); }\n#apple-now-playing-page .apple-now-playing-screen { color: var(--apple-now-playing-muted); }\n#apple-now-playing-page .apple-now-playing-left {\n  display: grid; gap: clamp(14px, 3.1vh, 34px); min-width: 0; min-height: 0;\n  width: min(100%, max(202px, var(--apple-now-playing-cover-max))); max-height: 100%;\n  justify-self: center; overflow-x: hidden; overflow-y: auto; scrollbar-width: none;\n}\n#apple-now-playing-page .apple-now-playing-left::-webkit-scrollbar { display: none; width: 0; height: 0; }\n#apple-now-playing-page .apple-now-playing-left.is-sliding { z-index: 1; }\n@media (min-width: 801px) and (min-height: 401px) {\n  #apple-now-playing-page[data-display=\"all\"][data-panel=\"none\"] .apple-now-playing-left {\n    width: min(calc((100% - var(--apple-now-playing-column-gap)) * .4), max(202px, var(--apple-now-playing-cover-max)));\n  }\n}\n#apple-now-playing-page .apple-now-playing-cover-slot { display: grid; place-items: center; min-width: 0; }\n#apple-now-playing-page .apple-now-playing-cover {\n  display: grid; place-items: center; width: min(100%, var(--apple-now-playing-cover-max)); aspect-ratio: 1;\n  overflow: hidden; border-radius: clamp(12px, 1.5vw, 23px); background: #ffffff14;\n  box-shadow: 0 13px 34px #0003; font-size: 52px; color: var(--apple-now-playing-muted); position: relative;\n  transform: scale(.93);\n}\n#apple-now-playing-page.is-active .apple-now-playing-cover { transition: transform .28s ease; }\n#apple-now-playing-page.is-playing .apple-now-playing-cover { transform: scale(1); }\n#apple-now-playing-page .apple-now-playing-cover img { width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0; }\n#apple-now-playing-page .apple-now-playing-controls { display: grid; gap: clamp(11px, 2.5vh, 26px); min-width: 0; }\n#apple-now-playing-page .apple-now-playing-meta { display: flex; align-items: center; min-width: 0; gap: clamp(6px, .8vw, 12px); position: relative; }\n#apple-now-playing-page .apple-now-playing-track { flex: 1; min-width: 0; }\n#apple-now-playing-page .apple-now-playing-title, #apple-now-playing-page .apple-now-playing-sub { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n#apple-now-playing-page .apple-now-playing-title { font-size: clamp(19px, 2.05vw, 35px); font-weight: 750; }\n#apple-now-playing-page .apple-now-playing-sub { font-size: clamp(13px, 1.4vw, 22px); color: #c3eeffb8; margin-top: 3px; }\n#apple-now-playing-page .apple-now-playing-icon {\n  width: clamp(32px, 2.9vw, 44px); height: clamp(32px, 2.9vw, 44px);\n  display: grid; place-items: center; border-radius: 28%; flex: none;\n  font-size: clamp(19px, 1.85vw, 30px);\n}\n#apple-now-playing-page .apple-now-playing-icon:hover { background: var(--apple-now-playing-hover); color: var(--apple-now-playing-fg); }\n#apple-now-playing-page .apple-now-playing-meta .apple-now-playing-icon { border-radius: 50%; background: var(--apple-now-playing-hover); font-size: clamp(16px,1.5vw,24px); }\n#apple-now-playing-page .apple-now-playing-meta .apple-now-playing-icon:hover { background: var(--apple-now-playing-track); }\n#apple-now-playing-page .apple-now-playing-favorite[aria-pressed=true] svg { fill: currentColor; }\n#apple-now-playing-page .apple-now-playing-menu {\n  position:absolute; right: 0; top: calc(100% + 8px); z-index: 4; padding: 5px;\n  background: #203442; border: 1px solid #ffffff25; border-radius: 12px; box-shadow: 0 8px 20px #0004;\n}\n#apple-now-playing-page .apple-now-playing-menu button { display: block; padding: 8px 12px; border-radius: 8px; white-space: nowrap; }\n#apple-now-playing-page .apple-now-playing-menu button:hover { background: var(--apple-now-playing-hover); }\n#apple-now-playing-page input:where(:not(.apple-now-playing-host-portal *))[type=range] {\n  -webkit-appearance: none; appearance: none; width: 100%; min-width: 0; height: 20px; margin: 0;\n  padding: 0; background: transparent; cursor: pointer;\n}\n#apple-now-playing-page input:where(:not(.apple-now-playing-host-portal *))[type=range]::-webkit-slider-runnable-track {\n  height: 9px; border-radius: 999px;\n  background: linear-gradient(to right,var(--apple-now-playing-fg) 0 var(--fill,0%),var(--apple-now-playing-track) var(--fill,0%) 100%);\n}\n#apple-now-playing-page input:where(:not(.apple-now-playing-host-portal *))[type=range]::-webkit-slider-thumb {\n  -webkit-appearance: none; width: 10px; height: 9px; border-radius: 50%; background: transparent;\n}\n#apple-now-playing-page input:where(:not(.apple-now-playing-host-portal *))[type=range]:hover::-webkit-slider-thumb, #apple-now-playing-page input:where(:not(.apple-now-playing-host-portal *))[type=range]:focus-visible::-webkit-slider-thumb {\n  background: white; transform: scale(1.3);\n}\n#apple-now-playing-page .apple-now-playing-timeline { position: relative; }\n#apple-now-playing-page .apple-now-playing-times {\n  display: grid; grid-template-columns: minmax(5ch, 1fr) minmax(0, max-content) minmax(5ch, 1fr);\n  align-items: center; column-gap: 4px; margin-top: 4px; color: var(--apple-now-playing-muted);\n  font-size: clamp(12px, 1.08vw, 17px); font-variant-numeric: tabular-nums;\n}\n#apple-now-playing-page .apple-now-playing-elapsed { grid-area: 1 / 1; justify-self: start; }\n#apple-now-playing-page .apple-now-playing-remaining { grid-area: 1 / 3; justify-self: end; }\n#apple-now-playing-page .apple-now-playing-times :is(.apple-now-playing-loading, .apple-now-playing-quality) {\n  grid-area: 1 / 2; justify-self: center; min-width: 0; max-width: 100%;\n  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;\n}\n#apple-now-playing-page .apple-now-playing-loading { font-size: 11px; pointer-events: none; }\n#apple-now-playing-page .apple-now-playing-times .apple-now-playing-loading:not([hidden]) + .apple-now-playing-quality { display: none; }\n#apple-now-playing-page .apple-now-playing-play-area { display: grid; gap: 4px; min-width: 0; }\n#apple-now-playing-page .apple-now-playing-transport { display: flex; justify-content: space-between; align-items: center; }\n#apple-now-playing-page .apple-now-playing-transport .apple-now-playing-skip { font-size: clamp(28px,3vw,46px); width: 55px; height: 50px; }\n#apple-now-playing-page .apple-now-playing-transport .apple-now-playing-play { font-size: clamp(37px,3.45vw,54px); width: 63px; height: clamp(49px, 6.2vh, 66px); }\n#apple-now-playing-page .apple-now-playing-mode { color: #c3eeff9e; position: relative; }\n#apple-now-playing-page .apple-now-playing-mode[data-mode=playAi] > svg { transform: scale(1.25); }\n#apple-now-playing-page .apple-now-playing-mode:is([data-mode=playCycle], [data-mode=playOneCycle], [data-mode=playRandom]) { color: #fff; }\n#apple-now-playing-page .apple-now-playing-transport-spacer { width: clamp(32px, 2.9vw, 44px); }\n#apple-now-playing-page .apple-now-playing-mode[data-mode=playOneCycle]::after {\n  content: \"1\"; position: absolute; top: 4px; right: 2px; background: var(--apple-now-playing-selected); color: var(--apple-now-playing-selected-ink);\n  width: 12px; height: 12px; border-radius: 4px; font-size: 9px;\n}\n#apple-now-playing-page .apple-now-playing-volume { display: flex; gap: clamp(9px, 1.25vw, 20px); align-items: center; color: #c3eeff9e; margin-top: 2.3vh; font-size: 17px; }\n#apple-now-playing-page .apple-now-playing-volume {\n  --anp-volume-motion: 460ms cubic-bezier(.38, .66, .29, 1.4);\n  gap: clamp(10px, 1.3vw, 20px); font-size: 14px;\n}\n#apple-now-playing-page .apple-now-playing-volume.is-adjusting { --anp-volume-motion: 240ms cubic-bezier(.32, .41, .52, .94); }\n#apple-now-playing-page .apple-now-playing-volume > svg { transform: scale(1.2); transition: transform var(--anp-volume-motion), color var(--anp-volume-motion); }\n#apple-now-playing-page .apple-now-playing-volume.is-adjusting > svg { transform: scale(1.5); color: var(--apple-now-playing-fg); }\n#apple-now-playing-page .apple-now-playing-volume-control { position: relative; flex: 1; min-width: 0; height: 28px; border-radius: 999px; }\n#apple-now-playing-page .apple-now-playing-volume-track {\n  position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%);\n  height: 10px; border-radius: 999px; overflow: hidden; background: var(--apple-now-playing-track);\n  transition: height var(--anp-volume-motion);\n}\n#apple-now-playing-page .apple-now-playing-volume.is-adjusting .apple-now-playing-volume-track { height: 19.44px; }\n#apple-now-playing-page .apple-now-playing-volume-fill {\n  display: block; width: var(--fill, 0%); height: 100%; background: var(--apple-now-playing-fg, #f7fbff);\n  opacity: .78; transition: opacity var(--anp-volume-motion);\n}\n#apple-now-playing-page .apple-now-playing-volume.is-adjusting .apple-now-playing-volume-fill { opacity: 1; }\n#apple-now-playing-page .apple-now-playing-volume-control .apple-now-playing-volume-input { position: absolute; inset: 0; height: 100%; opacity: 0; }\n#apple-now-playing-page .apple-now-playing-volume-track { pointer-events: none; }\n#apple-now-playing-page .apple-now-playing-volume-control .apple-now-playing-volume-input { z-index: 1; }\n#apple-now-playing-page .apple-now-playing-volume-input:focus-visible + .apple-now-playing-volume-track { box-shadow: 0 0 0 2px var(--apple-now-playing-focus); }\n#apple-now-playing-page .apple-now-playing-right { position: relative; align-self: stretch; min-height: 0; min-width: 0; }\n#apple-now-playing-page .apple-now-playing-lyrics, #apple-now-playing-page .apple-now-playing-queue { position: absolute; inset: 0; overflow: auto; overscroll-behavior: contain; }\n#apple-now-playing-page .apple-now-playing-lyrics {\n  -webkit-mask-image: linear-gradient(transparent,black 10%,black 89%,transparent);\n}\n#apple-now-playing-page .apple-now-playing-lyrics::-webkit-scrollbar, #apple-now-playing-page .apple-now-playing-queue::-webkit-scrollbar { width: 4px; }\n#apple-now-playing-page .apple-now-playing-lyrics::-webkit-scrollbar-thumb, #apple-now-playing-page .apple-now-playing-queue::-webkit-scrollbar-thumb { background: var(--apple-now-playing-grip); border-radius: 8px; }\n#apple-now-playing-page .apple-now-playing-lyrics-list { padding: 0 clamp(13px,2.2vw,34px) 0 0; display: flex; flex-direction: column; }\n#apple-now-playing-page .apple-now-playing-lyrics-list::before, #apple-now-playing-page .apple-now-playing-lyrics-list::after { content: \"\"; display:block; height: var(--apple-now-playing-lyric-pad, 32vh); flex: none; }\n#apple-now-playing-page .apple-now-playing-lyrics-list .apple-now-playing-line {\n  display: block; align-self: stretch; width: 100%; text-align: left; border-radius: clamp(14px,1.65vw,25px);\n  flex: none; font-size: clamp(24px, 3.15vw, 54px); font-weight: 760; line-height: 1.23;\n  padding: clamp(10px,2vh,23px) clamp(13px,1.6vw,24px); color: #e4f7ff72;\n  overflow-wrap: anywhere; transition: color .3s ease, background-color .2s ease;\n}\n#apple-now-playing-page .apple-now-playing-lyrics-list .apple-now-playing-line.right { text-align: right; }\n#apple-now-playing-page .apple-now-playing-lyrics-list .apple-now-playing-line:hover { background-color: #def8ff17; color: #f4fcffb5; }\n#apple-now-playing-page .apple-now-playing-lyrics-list .apple-now-playing-line.near { color: #e4f7ffa1; }\n#apple-now-playing-page .apple-now-playing-lyrics-list .apple-now-playing-line.current { color: #fff; }\n#apple-now-playing-page .apple-now-playing-lyrics-list .apple-now-playing-line:focus-visible { outline-offset: -3px; }\n#apple-now-playing-page .apple-now-playing-lyric-translation { display: block; font-size: .62em; font-weight: 700; margin-top: .35em; opacity: .72; }\n#apple-now-playing-page .apple-now-playing-line.current .apple-now-playing-lyric-translation { color: #dbf2ff8e; opacity: 1; }\n#apple-now-playing-page .apple-now-playing-status { position: absolute; inset: 0; display: grid; place-content: center; color: var(--apple-now-playing-muted); pointer-events: none; }\n#apple-now-playing-page .apple-now-playing-tabs { display: flex; gap: clamp(10px,1.5vw,22px); position: absolute; right: 2.8vw; bottom: 3.6vh; color: #d4f1ffaf; }\n#apple-now-playing-page .apple-now-playing-tabs [aria-pressed=true] { background: var(--apple-now-playing-selected); color: var(--apple-now-playing-selected-ink); }\n#apple-now-playing-page .apple-now-playing-queue { padding: 3vh 20px 0 0; }\n#apple-now-playing-page .apple-now-playing-queue h2 { font-size: clamp(22px,2.6vw,40px); margin: 0 0 14px; }\n#apple-now-playing-page .apple-now-playing-queue .apple-now-playing-queue-row {\n  display: flex; gap: 12px; align-items: center; width: 100%; text-align: left; padding: 10px 12px;\n  border-radius: 12px; min-height: 50px; font-size: 16px;\n}\n#apple-now-playing-page .apple-now-playing-queue-row:hover, #apple-now-playing-page .apple-now-playing-queue-row[aria-current=true] { background: var(--apple-now-playing-hover); }\n#apple-now-playing-page .apple-now-playing-queue-song { flex: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }\n#apple-now-playing-page .apple-now-playing-queue-artist { font-size: 13px; color: #d4f1ffb0; padding-left: 10px; }\n@media (max-height: 640px) {\n  #apple-now-playing-page {\n    --apple-now-playing-top: 47px; --apple-now-playing-bottom: 55px;\n    --apple-now-playing-controls-space: 204px;\n    --apple-now-playing-cover-max: min(390px, max(110px, calc(100vh - var(--apple-now-playing-top) - var(--apple-now-playing-bottom) - var(--apple-now-playing-controls-space))));\n  }\n  #apple-now-playing-page .apple-now-playing-left { gap: 10px; }\n  #apple-now-playing-page .apple-now-playing-controls { gap: 8px; }\n  #apple-now-playing-page .apple-now-playing-volume { margin-top: 0; }\n  #apple-now-playing-page .apple-now-playing-transport .apple-now-playing-skip, #apple-now-playing-page .apple-now-playing-transport .apple-now-playing-play { height: 40px; }\n}\n@media (max-width: 800px), (max-height: 400px) {\n  #apple-now-playing-page {\n    --apple-now-playing-gutter: clamp(14px, 7vw, 46px);\n    --apple-now-playing-cover-max: min(420px, max(125px, calc(100vh - var(--apple-now-playing-top) - var(--apple-now-playing-bottom) - var(--apple-now-playing-controls-space))));\n    grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(92px, 1fr);\n    align-items: start; gap: clamp(8px, 2vh, 16px);\n  }\n  #apple-now-playing-page[data-panel=\"none\"] { grid-template-rows: minmax(0, 1fr); align-items: center; }\n  #apple-now-playing-page:not([data-panel=\"none\"]) .apple-now-playing-left {\n    width: min(100%, 470px); grid-template-columns: auto minmax(0, 1fr);\n    align-items: center; gap: 6px 12px; overflow: visible;\n  }\n  #apple-now-playing-page:not([data-panel=\"none\"]) .apple-now-playing-cover { width: clamp(40px, 7.5vh, 68px); border-radius: 9px; font-size: 23px; }\n  #apple-now-playing-page:not([data-panel=\"none\"]) .apple-now-playing-controls { display: contents; }\n  #apple-now-playing-page:not([data-panel=\"none\"]) :is(.apple-now-playing-timeline, .apple-now-playing-play-area, .apple-now-playing-volume) { grid-column: 1 / -1; }\n  #apple-now-playing-page:not([data-panel=\"none\"]) .apple-now-playing-transport .apple-now-playing-icon { height: 36px; }\n  #apple-now-playing-page:not([data-panel=\"none\"]) .apple-now-playing-volume { margin-top: 0; }\n  #apple-now-playing-page .apple-now-playing-title { font-size: clamp(17px, 4vw, 23px); }\n  #apple-now-playing-page .apple-now-playing-lyrics-list .apple-now-playing-line { font-size: clamp(22px, 5vw, 36px); padding: 10px 9px; }\n  #apple-now-playing-page .apple-now-playing-tabs { right: var(--apple-now-playing-gutter); bottom: 9px; }\n  #apple-now-playing-page .apple-now-playing-queue { padding: 0 4px; }\n}\n@media (max-height: 400px) {\n  #apple-now-playing-page:not([data-panel=\"none\"]) .apple-now-playing-left {\n    grid-template-columns: 40px minmax(0, 1fr) minmax(100px, 1fr);\n  }\n  #apple-now-playing-page:not([data-panel=\"none\"]) .apple-now-playing-timeline { grid-column: 3; grid-row: 1; }\n  #apple-now-playing-page:not([data-panel=\"none\"]) .apple-now-playing-play-area { grid-column: 1 / 3; }\n  #apple-now-playing-page:not([data-panel=\"none\"]) .apple-now-playing-volume { grid-column: 3; }\n  #apple-now-playing-page .apple-now-playing-transport .apple-now-playing-skip, #apple-now-playing-page .apple-now-playing-transport .apple-now-playing-play { width: 36px; }\n  #apple-now-playing-page .apple-now-playing-volume { align-self: end; margin-bottom: 6px; }\n}\n@media (prefers-reduced-motion: reduce) {\n  #apple-now-playing-page.is-active .apple-now-playing-backdrop { animation: none !important; }\n  #apple-now-playing-page :where(:not(.apple-now-playing-host-portal, .apple-now-playing-host-portal *)), #apple-now-playing-page :where(:not(.apple-now-playing-host-portal, .apple-now-playing-host-portal *))::before { transition: none !important; }\n}\n#apple-now-playing-page .apple-now-playing-backdrop.apple-now-playing-cover-glow {\n  background: var(--apple-now-playing-base, #383838);\n  overflow: hidden;\n}\n#apple-now-playing-page .apple-now-playing-cover-glow::before {\n  content: \"\"; position: absolute; inset: -12%;\n  background: linear-gradient(115deg,#0003,#0008), var(--apple-now-playing-image) center / cover;\n  filter: blur(65px) saturate(1.35);\n}\n#apple-now-playing-page .apple-now-playing-queue-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 14px; }\n#apple-now-playing-page .apple-now-playing-queue-header h2 { margin: 0; }\n#apple-now-playing-page .apple-now-playing-queue-header button {\n  flex: none; padding: 8px 12px; border-radius: 999px; color: #e1f7ff; background: #e1f7ff19; font-size: 13px;\n}\n#apple-now-playing-page .apple-now-playing-queue-header button:hover { background: var(--apple-now-playing-track); }\n#apple-now-playing-page .apple-now-playing-backing { display: block; margin-top: .22em; text-align: right; }\n#apple-now-playing-page .apple-now-playing-duet { font-size: var(--apple-now-playing-duet-size); }\n#apple-now-playing-page .apple-now-playing-backing,\n#apple-now-playing-page .apple-now-playing-backing-vocal { font-size: var(--apple-now-playing-background-vocal-size); }\n.apple-now-playing-settings {\n  --anp-config-accent: #d12c37;\n  --anp-config-surface: #fff;\n  --anp-config-border: #dce3eb;\n  --anp-config-text: #233044;\n  --anp-config-muted: #586779;\n  --anp-config-hover: #fff0f1;\n  display: grid; gap: 24px; width: 100%; min-width: 0; box-sizing: border-box;\n  padding: 12px 4px 24px; color: var(--anp-config-text); text-align: start;\n}\n.apple-now-playing-settings h2 { margin: 0; font-size: 24px; font-weight: 700; line-height: 1.35; }\n.apple-now-playing-settings .anp-config-version { color: var(--anp-config-muted); font-size: .68em; font-weight: 500; }\n.apple-now-playing-settings .anp-config-section { display: grid; gap: 10px; min-width: 0; }\n.apple-now-playing-settings h3 {\n  display: flex; align-items: center; gap: 8px; margin: 0 0 2px; padding-inline-start: 2px;\n  font-size: 17px; font-weight: 650; line-height: 1.35;\n}\n.apple-now-playing-settings h3::before {\n  content: \"\"; flex: none; width: 4px; height: 16px; border-radius: 2px; background: var(--anp-config-accent);\n}\n.apple-now-playing-settings .anp-config-card {\n  display: flex; flex-wrap: wrap; align-items: center; gap: 14px; box-sizing: border-box; min-height: 68px;\n  padding: 12px 16px; margin: 0; border: 1px solid var(--anp-config-border); border-radius: 12px;\n  background: var(--anp-config-surface);\n}\n.apple-now-playing-settings label.anp-config-card { cursor: pointer; }\n.apple-now-playing-settings .anp-config-icon { flex: none; color: var(--anp-config-muted); }\n.apple-now-playing-settings .anp-config-icon svg { display: block; width: 21px; height: 21px; }\n.apple-now-playing-settings .anp-config-copy { display: grid; flex: 1 1 140px; min-width: 0; gap: 3px; overflow-wrap: anywhere; }\n.apple-now-playing-settings strong { color: var(--anp-config-text); font-size: 15px; font-weight: 600; line-height: 1.4; }\n.apple-now-playing-settings small, .apple-now-playing-settings output { color: var(--anp-config-muted); font-size: 13px; line-height: 1.45; }\n.apple-now-playing-settings .anp-config-action {\n  margin-inline-start: auto; padding: 7px 12px; border: 1px solid var(--anp-config-border); border-radius: 8px;\n  background: transparent; color: var(--anp-config-accent); font: inherit; font-size: 13px;\n  line-height: 1.4; text-decoration: none; cursor: pointer;\n}\n.apple-now-playing-settings .anp-config-action:hover { background: var(--anp-config-hover); }\n.apple-now-playing-settings .anp-config-action:disabled { opacity: .55; cursor: default; }\n.apple-now-playing-settings [data-refresh-lyrics]:disabled { cursor: wait; }\n.apple-now-playing-settings .anp-config-result { flex-basis: 100%; padding-inline-start: 35px; }\n.apple-now-playing-settings .anp-source-config { display: grid; align-items: stretch; gap: 10px; }\n.apple-now-playing-settings [data-lyric-source-order] { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }\n.apple-now-playing-settings [data-lyric-source-order] li {\n  display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; padding: 6px 0; font-size: 13px; overflow-wrap: anywhere;\n}\n.apple-now-playing-settings [data-lyric-source-order] li + li { border-top: 1px solid var(--anp-config-border); }\n.apple-now-playing-settings .anp-source-move { display: flex; gap: 5px; margin-inline-start: auto; }\n.apple-now-playing-settings .anp-source-move .anp-config-action { margin: 0; padding: 4px 8px; }\n.apple-now-playing-settings .anp-source-config form { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; }\n.apple-now-playing-settings .anp-source-config label { display: grid; gap: 4px; min-width: 0; font-size: 13px; }\n.apple-now-playing-settings .anp-source-config :is(input, select) {\n  min-width: 0; width: 100%; box-sizing: border-box; padding: 6px 8px; font: inherit; color: var(--anp-config-text);\n  background: var(--anp-config-surface); border: 1px solid var(--anp-config-border); border-radius: 6px;\n}\n.apple-now-playing-settings .anp-source-config :is(input, select):focus-visible { outline: 2px solid var(--anp-config-accent); outline-offset: 2px; }\n.apple-now-playing-settings .anp-source-config :is(.anp-source-url, button[type=submit]) { grid-column: 1 / -1; }\n.apple-now-playing-settings .anp-source-config button[type=submit] { justify-self: start; margin: 0; }\n.apple-now-playing-settings form[data-lyric-source-add] { grid-template-columns: minmax(0, 1fr); }\n.apple-now-playing-settings .anp-source-format { grid-template-columns: max-content minmax(0, 1fr); align-items: center; gap: 8px; }\n.apple-now-playing-settings [data-lyric-source-add] button[type=submit] { justify-self: stretch; }\n.apple-now-playing-settings [data-lyric-source-import] { padding-top: 10px; border-top: 1px solid var(--anp-config-border); }\n.apple-now-playing-settings .anp-config-switch {\n  -webkit-appearance: none; appearance: none; position: relative; flex: none; width: 42px; height: 24px;\n  margin: 0 0 0 auto; padding: 0; border: 0; border-radius: 999px; background: #a8b3c0; cursor: pointer;\n}\n.apple-now-playing-settings .anp-config-switch::after {\n  content: \"\"; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px;\n  border-radius: 50%; background: white; box-shadow: 0 1px 3px #16203533;\n}\n.apple-now-playing-settings .anp-config-switch:checked { background: var(--anp-config-accent); }\n.apple-now-playing-settings .anp-config-switch:checked::after { transform: translateX(18px); }\n.apple-now-playing-settings :is(.anp-config-switch, .anp-config-action):focus-visible {\n  outline: 2px solid var(--anp-config-accent); outline-offset: 3px;\n}\n@media (prefers-color-scheme: dark) {\n  .apple-now-playing-settings {\n    --anp-config-accent: #ff858b;\n    --anp-config-surface: #222b38;\n    --anp-config-border: #3b4758;\n    --anp-config-text: #e8eff7;\n    --anp-config-muted: #b6c3d3;\n    --anp-config-hover: #432b35;\n  }\n}\n\n/* V2 reading surfaces and appearance preferences stay inside the plugin. */\n#apple-now-playing-page {\n  --apple-now-playing-base: #383838;\n  --apple-now-playing-fg: #fafafa;\n  --apple-now-playing-muted: #dededed1;\n  --apple-now-playing-idle: #dedede73;\n  --apple-now-playing-near: #dededea8;\n  --apple-now-playing-unlit: #fafafaa3;\n  --apple-now-playing-surface: #171717fa;\n  --apple-now-playing-hover: #dedede26;\n  --apple-now-playing-track: #dedede52;\n  --apple-now-playing-selected: #dfdfdff0;\n  --apple-now-playing-selected-ink: #181818;\n  --apple-now-playing-grip: #dedede7a;\n  --apple-now-playing-focus: #dedede66;\n  --apple-now-playing-word-halo: rgba(250,250,250,.35);\n  --apple-now-playing-meta-halo: rgba(222,222,222,.20);\n  color: var(--apple-now-playing-fg);\n}\n#apple-now-playing-page .apple-now-playing-backdrop { z-index: -3; }\n#apple-now-playing-page .apple-now-playing-page-background {\n  position: absolute; inset: 0; z-index: -2; pointer-events: none; isolation: isolate;\n  background: var(--apple-now-playing-base, #383838);\n}\n#apple-now-playing-page .apple-now-playing-page-background::before, #apple-now-playing-page .apple-now-playing-page-background::after {\n  content: \"\"; position: absolute; inset: 0; pointer-events: none; z-index: -2;\n}\n#apple-now-playing-page .apple-now-playing-page-background::after { background: rgb(0 0 0 / var(--apple-now-playing-background-dim, 0)); }\n#apple-now-playing-page:not([data-background=\"gradient\"]) .apple-now-playing-backdrop,\n#apple-now-playing-page[data-motion=\"false\"] .apple-now-playing-backdrop { animation: none !important; }\n#apple-now-playing-page[data-background=\"blur\"] .apple-now-playing-backdrop {\n  background: var(--apple-now-playing-image) center / cover, var(--apple-now-playing-base);\n  filter: blur(var(--apple-now-playing-background-blur, 60px)); transform: scale(1.12);\n}\n#apple-now-playing-page[data-background=\"blur\"] .apple-now-playing-backdrop::before { display: none; }\n#apple-now-playing-page[data-background=\"solid\"] .apple-now-playing-backdrop { background: var(--apple-now-playing-c, #383838); }\n#apple-now-playing-page .apple-now-playing-right { display: flex; flex-direction: column; min-height: 0; }\n#apple-now-playing-page .apple-now-playing-lyrics:focus { outline: none; }\n#apple-now-playing-page .apple-now-playing-panel-content { position: relative; flex: 1; min-height: 0; }\n#apple-now-playing-page .apple-now-playing-lyric-actions { display: flex; align-items: center; gap: inherit; }\n#apple-now-playing-page .apple-now-playing-offset button, #apple-now-playing-page .apple-now-playing-copy-tools button, #apple-now-playing-page .apple-now-playing-settings-actions button {\n  padding: 6px 9px; border-radius: 8px; line-height: 1.2;\n}\n#apple-now-playing-page .apple-now-playing-offset button:hover, #apple-now-playing-page .apple-now-playing-copy-tools button:hover,\n#apple-now-playing-page .apple-now-playing-settings-actions button:hover { background: var(--apple-now-playing-hover); }\n#apple-now-playing-page .apple-now-playing-settings-actions { display: flex; flex-wrap: wrap; gap: 8px; padding-top: 8px; }\n#apple-now-playing-page .apple-now-playing-settings-actions button { background: var(--apple-now-playing-hover); }\n#apple-now-playing-page .apple-now-playing-settings-actions .apple-now-playing-setting-help { flex: 0 0 100%; margin: 0; }\n#apple-now-playing-page .apple-now-playing-lyric-settings .apple-now-playing-pref-row { flex-wrap: wrap; }\n#apple-now-playing-page .apple-now-playing-lyric-settings .apple-now-playing-pref-caption { flex: 1; min-width: 88px; }\n#apple-now-playing-page .apple-now-playing-offset { display: flex; align-items: center; gap: 2px; }\n#apple-now-playing-page .apple-now-playing-offset-value { min-width: 44px; font-variant-numeric: tabular-nums; white-space: nowrap; text-align: center; }\n#apple-now-playing-page .apple-now-playing-lyrics-list, #apple-now-playing-page .apple-now-playing-queue-list { position: relative; display: block; padding: 0; }\n#apple-now-playing-page .apple-now-playing-lyrics-list::before, #apple-now-playing-page .apple-now-playing-lyrics-list::after { display: none; }\n#apple-now-playing-page .apple-now-playing-lyrics-list > *, #apple-now-playing-page .apple-now-playing-queue-list > * {\n  position: absolute; left: 0; right: 0; width: 100%;\n}\n#apple-now-playing-page .apple-now-playing-lyrics-list .apple-now-playing-line {\n  font-size: var(--apple-now-playing-font-size, clamp(24px, 3.15vw, 54px));\n  color: var(--apple-now-playing-idle); margin: 0;\n}\n#apple-now-playing-page .apple-now-playing-lyrics-list .apple-now-playing-line.near { color: var(--apple-now-playing-near); }\n#apple-now-playing-page .apple-now-playing-lyrics-list .apple-now-playing-line.current { color: var(--apple-now-playing-fg); }\n#apple-now-playing-page .apple-now-playing-lyrics-list .apple-now-playing-line:hover { background: var(--apple-now-playing-hover); color: var(--apple-now-playing-near); }\n#apple-now-playing-page .apple-now-playing-lyrics-list .apple-now-playing-line.current:hover { color: var(--apple-now-playing-fg); }\n#apple-now-playing-page .apple-now-playing-lyric-translation, #apple-now-playing-page .apple-now-playing-line.current .apple-now-playing-lyric-translation {\n  font-size: var(--apple-now-playing-translation-size, .64em); color: var(--apple-now-playing-muted);\n}\n#apple-now-playing-page .apple-now-playing-lyric-roman { display: block; font-size: var(--apple-now-playing-roman-size, .64em); color: var(--apple-now-playing-muted); margin-top: .25em; }\n#apple-now-playing-page .apple-now-playing-backing { color: var(--apple-now-playing-idle); }\n#apple-now-playing-page .apple-now-playing-backing .vocal-active { color: var(--apple-now-playing-fg); }\n#apple-now-playing-page .apple-now-playing-interlude { height: 76px; display: flex !important; align-items: center; gap: 12px; }\n#apple-now-playing-page .apple-now-playing-dots { display: flex; gap: 12px; align-items: center; transform: scale(0); opacity: 0; transform-origin: left center; }\n#apple-now-playing-page .apple-now-playing-interlude i { display: block; width: 12px; height: 12px; border-radius: 100%; background: var(--apple-now-playing-fg); opacity: 0; }\n/* Keep the gutter fixed so revealing the thumb cannot rewrap lyrics. */\n#apple-now-playing-page .apple-now-playing-lyrics::-webkit-scrollbar,\n#apple-now-playing-page .apple-now-playing-lyrics::-webkit-scrollbar-track,\n#apple-now-playing-page .apple-now-playing-lyrics:not(.apple-now-playing-user-scrolling)::-webkit-scrollbar-thumb { background: transparent; border: 0; box-shadow: none; }\n#apple-now-playing-page[data-scrollbar=\"false\"] .apple-now-playing-lyrics { scrollbar-width: none; }\n#apple-now-playing-page[data-scrollbar=\"false\"] .apple-now-playing-lyrics::-webkit-scrollbar { display: none; width: 0; }\n#apple-now-playing-page .apple-now-playing-queue { padding: 0 8px; display: flex; flex-direction: column; overflow: hidden; }\n#apple-now-playing-page .apple-now-playing-queue-scroll { min-height: 0; flex: 1; overflow: auto; overscroll-behavior: contain; }\n#apple-now-playing-page .apple-now-playing-queue-source { color: var(--apple-now-playing-muted); font-size: 13px; margin-bottom: 12px; }\n#apple-now-playing-page .apple-now-playing-queue-heading { padding: 8px 12px; font-size: 13px; color: var(--apple-now-playing-muted); }\n#apple-now-playing-page .apple-now-playing-queue-row { color: var(--apple-now-playing-fg); min-height: 58px !important; }\n#apple-now-playing-page .apple-now-playing-queue-row[aria-current=\"true\"], #apple-now-playing-page .apple-now-playing-queue-row:hover { background: var(--apple-now-playing-hover); }\n#apple-now-playing-page .apple-now-playing-queue-artist { color: var(--apple-now-playing-muted); }\n#apple-now-playing-page .apple-now-playing-queue-header button { color: var(--apple-now-playing-fg); background: var(--apple-now-playing-hover); }\n#apple-now-playing-page .apple-now-playing-track .apple-now-playing-title {\n  display: block; max-width: 100%; text-align: left; color: var(--apple-now-playing-fg);\n}\n#apple-now-playing-page .apple-now-playing-title:disabled { cursor: default; opacity: 1; }\n#apple-now-playing-page .apple-now-playing-sub { color: var(--apple-now-playing-muted); }\n#apple-now-playing-page .apple-now-playing-sub button { display: inline; max-width: 100%; text-align: left; vertical-align: baseline; }\n#apple-now-playing-page .apple-now-playing-sub button:hover, #apple-now-playing-page .apple-now-playing-title:not(:disabled):hover { text-decoration: underline; }\n#apple-now-playing-page .apple-now-playing-alias { color: var(--apple-now-playing-muted); font-size: .8em; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; margin-top: 4px; }\n#apple-now-playing-page .apple-now-playing-quality { color: var(--apple-now-playing-muted); font-size: 10px; line-height: 1.5; }\n#apple-now-playing-page .apple-now-playing-cover-slot { position: relative; isolation: isolate; }\n#apple-now-playing-page .apple-now-playing-left {\n  box-sizing: border-box; padding: 12px; margin: 0;\n  max-width: 100%;\n}\n#apple-now-playing-page .apple-now-playing-cover { box-shadow: 0 5px 15px #00000018; }\n#apple-now-playing-page[data-cover-shadow=\"true\"] .apple-now-playing-cover { box-shadow: 0 8px 22px #00000029, 0 2px 6px #00000012; }\n/* Shade the visible glyphs after ellipsis clipping. Keep each metadata line independent. */\n#apple-now-playing-page[data-text-shadow=\"true\"] { --apple-now-playing-meta-shadow: drop-shadow(0 1px 1px rgba(0, 0, 0, .38)); }\n#apple-now-playing-page[data-text-glow=\"true\"] { --apple-now-playing-meta-glow: drop-shadow(0 0 1.25px var(--apple-now-playing-meta-halo)); }\n#apple-now-playing-page[data-text-shadow=\"true\"] :is(.apple-now-playing-title, .apple-now-playing-alias, .apple-now-playing-sub) { filter: var(--apple-now-playing-meta-shadow); }\n#apple-now-playing-page[data-text-glow=\"true\"] :is(.apple-now-playing-title, .apple-now-playing-alias, .apple-now-playing-sub) { filter: var(--apple-now-playing-meta-glow); }\n#apple-now-playing-page[data-text-shadow=\"true\"][data-text-glow=\"true\"] :is(.apple-now-playing-title, .apple-now-playing-alias, .apple-now-playing-sub) {\n  filter: var(--apple-now-playing-meta-glow) var(--apple-now-playing-meta-shadow);\n}\n#apple-now-playing-page .apple-now-playing-menu, #apple-now-playing-page .apple-now-playing-row-menu {\n  position: fixed; z-index: 20; top: 60px; left: 16px; right: auto;\n  min-width: 210px; max-width: min(330px, calc(100vw - 24px)); max-height: min(560px, 78vh);\n  overflow: auto; background: var(--apple-now-playing-surface); color: var(--apple-now-playing-fg);\n  padding: 6px; border: 1px solid #80808044; border-radius: 12px; box-shadow: 0 10px 35px #0004;\n}\n#apple-now-playing-page .apple-now-playing-menu button, #apple-now-playing-page .apple-now-playing-row-menu button {\n  display: block; text-align: left; padding: 9px 12px; border-radius: 7px;\n  width: 100%; white-space: normal; font-size: 13px;\n}\n#apple-now-playing-page .apple-now-playing-menu button:hover, #apple-now-playing-page .apple-now-playing-row-menu button:hover { background: var(--apple-now-playing-hover); }\n#apple-now-playing-page .apple-now-playing-settings-panel {\n  position: absolute; z-index: 25; top: 54px; right: 18px; width: min(390px, calc(100% - 36px));\n  max-height: calc(100% - 75px); display: flex; flex-direction: column; overflow: hidden;\n  background: var(--apple-now-playing-surface); color: var(--apple-now-playing-fg); border-radius: 16px; box-shadow: 0 12px 50px #0006;\n  border: 1px solid #80808044;\n}\n#apple-now-playing-page .apple-now-playing-settings-header { display: flex; padding: 18px; align-items: center; gap: 12px; }\n#apple-now-playing-page .apple-now-playing-settings-header h2 { font-size: 18px; margin: 0; flex: 1; }\n#apple-now-playing-page .apple-now-playing-settings-header button { padding: 5px 8px; border-radius: 6px; }\n#apple-now-playing-page .apple-now-playing-preferences { overflow: auto; padding: 0 18px 18px; min-height: 0; font-size: 13px; }\n#apple-now-playing-page .apple-now-playing-preferences fieldset { border: 0; margin: 0; padding: 10px 0 14px; }\n#apple-now-playing-page .apple-now-playing-preferences legend { color: var(--apple-now-playing-muted); font-size: 12px; padding: 6px 0; }\n#apple-now-playing-page .apple-now-playing-pref-row { display: flex; align-items: center; gap: 8px; min-height: 40px; padding: 4px 0; }\n#apple-now-playing-page .apple-now-playing-pref-row label { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }\n#apple-now-playing-page .apple-now-playing-pref-row label > span { flex: 1; }\n#apple-now-playing-page .apple-now-playing-pref-row input[type=\"range\"] { width: 85px; height: 20px; }\n#apple-now-playing-page .apple-now-playing-pref-row input[type=\"range\"]::-webkit-slider-runnable-track { height: 4px; background: #8887; }\n#apple-now-playing-page .apple-now-playing-pref-row input[type=\"range\"]::-webkit-slider-thumb { width: 12px; height: 12px; background: var(--apple-now-playing-fg); margin-top: -4px; }\n#apple-now-playing-page .apple-now-playing-pref-row select {\n  font: inherit; padding: 5px 6px; color: var(--apple-now-playing-fg); background: var(--apple-now-playing-surface);\n  border: 1px solid #8886; border-radius: 6px; max-width: 160px;\n}\n#apple-now-playing-page .apple-now-playing-pref-row > button { font-size: 11px; color: var(--apple-now-playing-muted); padding: 5px; }\n#apple-now-playing-page .apple-now-playing-pref-value { font-size: 11px; font-variant-numeric: tabular-nums; min-width: 26px; }\n#apple-now-playing-page .apple-now-playing-copy-view { position: absolute; inset: 0; display: flex; flex-direction: column; gap: 14px; }\n#apple-now-playing-page .apple-now-playing-copy-tools { display: flex; flex-wrap: wrap; gap: 10px; font-size: 13px; }\n#apple-now-playing-page .apple-now-playing-copy-text {\n  width: 100%; min-height: 0; flex: 1; resize: none; border: 0; border-radius: 12px;\n  padding: 16px; background: var(--apple-now-playing-hover); color: var(--apple-now-playing-fg); font: inherit; font-size: 17px; line-height: 1.7; font-weight: 400;\n  user-select: text; -webkit-user-select: text;\n}\n#apple-now-playing-page .apple-now-playing-preview {\n  position: fixed; z-index: 30; transform: translate(-50%, -100%); width: 290px; max-width: calc(100vw - 24px);\n  max-height: 42vh; overflow: hidden; padding: 14px 16px; border-radius: 12px;\n  box-shadow: 0 8px 30px #0005; background: var(--apple-now-playing-surface); color: var(--apple-now-playing-fg);\n  font-size: 17px; pointer-events: none; text-align: left;\n}\n#apple-now-playing-page .apple-now-playing-preview-time { color: var(--apple-now-playing-muted); font-size: 12px; margin-bottom: 6px; font-variant-numeric: tabular-nums; }\n#apple-now-playing-page .apple-now-playing-toast {\n  position: absolute; z-index: 40; bottom: 28px; left: 50%; transform: translateX(-50%);\n  padding: 10px 18px; border-radius: 10px; background: var(--apple-now-playing-surface); box-shadow: 0 3px 18px #0003;\n  font-size: 13px; max-width: calc(100% - 32px);\n}\n#apple-now-playing-page .apple-now-playing-clipboard { position: fixed; left: 16px; top: 16px; width: 2px; height: 2px; opacity: .01; }\n#apple-now-playing-page .apple-now-playing-cover-flight {\n  position: fixed; z-index: 50; pointer-events: none; transform-origin: top left; overflow: hidden;\n}\n#apple-now-playing-page .apple-now-playing-cover-flight img { display: block; width: 100%; height: 100%; object-fit: cover; }\n#apple-now-playing-page .apple-now-playing-cover.shared-art { background-position: center; background-size: cover; }\n#apple-now-playing-page .apple-now-playing-cover.shared-art > svg { visibility: hidden; }\n#apple-now-playing-page .apple-now-playing-cover::after, #apple-now-playing-page .apple-now-playing-cover-flight-edge {\n  content: \"\"; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; box-shadow: inset 0 0 0 1px #ffffff24;\n}\nimg.apple-now-playing-shared-thumbnail { visibility: hidden !important; }\n#apple-now-playing-page.is-opening .apple-now-playing-cover { transition: none; }\n#apple-now-playing-page.cover-moving .apple-now-playing-cover { visibility: hidden; }\n#apple-now-playing-page.is-closing { overscroll-behavior: none; touch-action: none; }\n#apple-now-playing-page.is-active.is-closing .apple-now-playing-backdrop { animation-play-state: paused; }\n#apple-now-playing-page.is-closing .apple-now-playing-drag-bar { -webkit-app-region: no-drag; }\n#apple-now-playing-page.is-closing::after {\n  content: \"\"; position: absolute; inset: 0; z-index: 90; -webkit-app-region: no-drag;\n}\n#apple-now-playing-page.is-closing::backdrop { background: transparent; }\n#apple-now-playing-page[data-display=\"lyrics\"]:not([data-panel=\"none\"]) {\n  grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) auto; gap: 14px;\n}\n#apple-now-playing-page[data-display=\"lyrics\"]:not([data-panel=\"none\"]) .apple-now-playing-left {\n  grid-row: 2; width: min(100%, 560px); overflow: visible;\n}\n#apple-now-playing-page[data-display=\"lyrics\"]:not([data-panel=\"none\"]) .apple-now-playing-cover-slot,\n#apple-now-playing-page[data-display=\"lyrics\"]:not([data-panel=\"none\"]) .apple-now-playing-meta { display: none; }\n#apple-now-playing-page[data-display=\"lyrics\"]:not([data-panel=\"none\"]) .apple-now-playing-controls { gap: 7px; }\n#apple-now-playing-page[data-display=\"lyrics\"]:not([data-panel=\"none\"]) .apple-now-playing-volume { margin-top: 0; }\n#apple-now-playing-page[data-display=\"lyrics\"]:not([data-panel=\"none\"]) .apple-now-playing-right { grid-row: 1; width: min(100%, 1100px); justify-self: center; }\n#apple-now-playing-page .apple-now-playing-times, #apple-now-playing-page .apple-now-playing-mode, #apple-now-playing-page .apple-now-playing-volume, #apple-now-playing-page .apple-now-playing-tabs, #apple-now-playing-page .apple-now-playing-screen { color: var(--apple-now-playing-muted); }\n#apple-now-playing-page .apple-now-playing-mode:is([data-mode=playCycle], [data-mode=playOneCycle], [data-mode=playRandom]) { color: var(--apple-now-playing-fg); }\n#apple-now-playing-page select:where(:not(.apple-now-playing-host-portal *)):focus-visible, #apple-now-playing-page textarea:where(:not(.apple-now-playing-host-portal *)):focus-visible { outline: 2px solid var(--apple-now-playing-fg); outline-offset: 3px; }\n@media (max-width: 800px), (max-height: 400px) {\n  #apple-now-playing-page .apple-now-playing-lyrics-list .apple-now-playing-line { font-size: var(--apple-now-playing-font-size, clamp(22px, 5vw, 36px)); }\n  #apple-now-playing-page .apple-now-playing-offset button { padding: 5px 6px; }\n  #apple-now-playing-page.controls-hidden:not([data-panel=\"none\"]) .apple-now-playing-left { display: none; }\n  #apple-now-playing-page.controls-hidden:not([data-panel=\"none\"]) { grid-template-rows: minmax(0, 1fr); }\n  #apple-now-playing-page.controls-hidden:not([data-panel=\"none\"]) .apple-now-playing-right { grid-row: 1; }\n  #apple-now-playing-page[data-display=\"lyrics\"]:not([data-panel=\"none\"]) .apple-now-playing-controls { display: grid; }\n  #apple-now-playing-page[data-display=\"lyrics\"]:not([data-panel=\"none\"]) .apple-now-playing-left { display: block; }\n  #apple-now-playing-page[data-display=\"lyrics\"].controls-hidden:not([data-panel=\"none\"]) .apple-now-playing-left { display: none; }\n}\n\n\n/* V3 advanced effects remain optional and scoped to this page. */\n#apple-now-playing-page .apple-now-playing-backgrounds {\n  position: absolute; inset: 0; z-index: -3; overflow: hidden; pointer-events: none;\n}\n#apple-now-playing-page[data-audio-reactive=\"true\"] .apple-now-playing-backgrounds {\n  transform: scale(calc(1 + var(--apple-now-playing-audio-pulse, 0) * .035));\n  filter: brightness(calc(1 + var(--apple-now-playing-audio-pulse, 0) * .08));\n}\n#apple-now-playing-page .apple-now-playing-backgrounds .apple-now-playing-backdrop { z-index: 0; }\n#apple-now-playing-page .apple-now-playing-fluid {\n  position: absolute; inset: -96px; width: calc(100% + 192px); height: calc(100% + 192px); display: block; z-index: 1;\n  filter: blur(24px) saturate(1.15);\n}\n#apple-now-playing-page:is([data-background=\"fluid\"], [data-background=\"fluid-static\"]) .apple-now-playing-backdrop { display: none; }\n/* Each source timing fragment moves its base ink, sweep and glow together. */\n#apple-now-playing-page :is(.apple-now-playing-word, .apple-now-playing-roman-word) {\n  position: relative; display: inline-block; max-width: 100%; vertical-align: baseline;\n  white-space: pre-wrap; overflow-wrap: anywhere;\n}\n#apple-now-playing-page[data-lyric-lift=\"true\"] .apple-now-playing-line:is(.current, .departing) .apple-now-playing-word {\n  transform: translateY(var(--apple-now-playing-word-lift, 0em));\n}\n#apple-now-playing-page .apple-now-playing-motion-glyph { display: inline-block; vertical-align: baseline; max-width: 100%; }\n#apple-now-playing-page[data-lyric-lift=\"true\"] .apple-now-playing-line:is(.current, .departing) .apple-now-playing-motion-glyph {\n  transform: var(--apple-now-playing-glyph-transform, none);\n}\n#apple-now-playing-page .apple-now-playing-ink {\n  display: block; -webkit-text-fill-color: currentColor;\n}\n#apple-now-playing-page .apple-now-playing-line .apple-now-playing-ink,\n#apple-now-playing-page .apple-now-playing-preview .apple-now-playing-ink { color: var(--apple-now-playing-unlit); }\n#apple-now-playing-page .apple-now-playing-line .apple-now-playing-roman-word > .apple-now-playing-ink,\n#apple-now-playing-page .apple-now-playing-preview .apple-now-playing-roman-word > .apple-now-playing-ink { color: var(--apple-now-playing-unlit); }\n\n#apple-now-playing-page :is(.apple-now-playing-lit, .apple-now-playing-glow-mask) {\n  display: block; position: absolute; inset: 0; pointer-events: none;\n  -webkit-mask-image: var(--apple-now-playing-ink-mask, linear-gradient(transparent,transparent));\n  -webkit-mask-size: var(--apple-now-playing-mask-size, 100% 100%);\n  -webkit-mask-position: var(--apple-now-playing-mask-position, left top);\n  -webkit-mask-repeat: no-repeat;\n}\n#apple-now-playing-page :is(.apple-now-playing-lit, .apple-now-playing-glow-mask)::before { content: attr(data-text); }\n#apple-now-playing-page .apple-now-playing-split-ink::before { content: none; }\n#apple-now-playing-page .apple-now-playing-motion-glyph[data-text]::before { content: attr(data-text); }\n#apple-now-playing-page .apple-now-playing-lit {\n  color: var(--apple-now-playing-fg); -webkit-text-fill-color: currentColor;\n  opacity: 0;\n}\n#apple-now-playing-page .apple-now-playing-line:is(.current, .departing) .apple-now-playing-lit {\n  opacity: var(--apple-now-playing-ink-opacity, 1);\n}\n#apple-now-playing-page .apple-now-playing-preview .apple-now-playing-lit { opacity: 1; }\n\n#apple-now-playing-page .apple-now-playing-line, #apple-now-playing-page .apple-now-playing-ink, #apple-now-playing-page .apple-now-playing-lit, #apple-now-playing-page .apple-now-playing-lit::before { text-shadow: none; }\n#apple-now-playing-page[data-text-shadow=\"true\"] .apple-now-playing-ink { text-shadow: 0 2px 4px #0005; }\n/* Blur a masked copy of the sung ink. The foreground keeps crisp edges. */\n#apple-now-playing-page .apple-now-playing-word-glow {\n  display: none; position: absolute; inset: 0; pointer-events: none;\n  color: var(--apple-now-playing-fg); -webkit-text-fill-color: currentColor;\n  filter: blur(.067em);\n  opacity: calc(var(--apple-now-playing-text-glow, 0) * var(--apple-now-playing-ink-opacity, 1));\n}\n#apple-now-playing-page .apple-now-playing-line:is(.current, .departing) .apple-now-playing-word-glow { display: block; }\n#apple-now-playing-page .apple-now-playing-split-glow { opacity: var(--apple-now-playing-ink-opacity, 1); }\n#apple-now-playing-page .apple-now-playing-word-glow .apple-now-playing-motion-glyph {\n  opacity: var(--apple-now-playing-text-glow, 0);\n  text-shadow: 0 0 0 currentColor;\n}\n#apple-now-playing-page[data-text-glow=\"true\"] .apple-now-playing-word-glow { --apple-now-playing-text-glow: .18; }\n#apple-now-playing-page[data-text-glow=\"true\"] .apple-now-playing-line.current .apple-now-playing-original:not(.apple-now-playing-timed) { text-shadow: 0 0 7px var(--apple-now-playing-focus); }\n#apple-now-playing-page .apple-now-playing-font-chooser { display: flex; flex-wrap: wrap; gap: 8px; padding: 10px 0; align-items: center; }\n#apple-now-playing-page .apple-now-playing-font-chooser select {\n  max-width: 100%; min-width: 120px; padding: 6px; font: inherit;\n  background: var(--apple-now-playing-surface); color: var(--apple-now-playing-fg); border: 1px solid #8886; border-radius: 6px;\n}\n#apple-now-playing-page .apple-now-playing-font-chooser button { padding: 6px; background: var(--apple-now-playing-hover); border-radius: 6px; }\n#apple-now-playing-page .apple-now-playing-font-status, #apple-now-playing-page .apple-now-playing-audio-status {\n  flex-basis: 100%; color: var(--apple-now-playing-muted); font-size: 11px; line-height: 1.5; padding: 4px 0;\n}\n#apple-now-playing-page .apple-now-playing-pref-row input[type=\"text\"] {\n  width: 170px; max-width: 65%; padding: 6px; border: 1px solid #8886; border-radius: 6px;\n  font: inherit; color: var(--apple-now-playing-fg); background: var(--apple-now-playing-surface);\n}\n#apple-now-playing-page .apple-now-playing-pref-row input[data-preference=\"globalOffset\"] { width: 74px; }\n#apple-now-playing-page .apple-now-playing-source-panel {\n  position: absolute; z-index: 25; top: 54px; right: 18px; width: min(470px, calc(100% - 36px));\n  max-height: calc(100% - 75px); display: flex; flex-direction: column; overflow: hidden;\n  background: var(--apple-now-playing-surface); color: var(--apple-now-playing-fg); border-radius: 16px;\n  border: 1px solid #80808044; box-shadow: 0 12px 50px #0006;\n}\n#apple-now-playing-page .apple-now-playing-source-content { overflow: auto; padding: 0 18px 18px; min-height: 0; font-size: 13px; }\n#apple-now-playing-page .apple-now-playing-source-entry { display: flex; flex-direction: column; gap: 5px; margin-bottom: 16px; overflow-wrap: anywhere; }\n#apple-now-playing-page .apple-now-playing-source-entry strong { font-size: 11px; color: var(--apple-now-playing-muted); font-weight: 500; }\n#apple-now-playing-page .apple-now-playing-source-entry span { font-weight: 500; user-select: text; -webkit-user-select: text; }\n#apple-now-playing-page .apple-now-playing-queue-menu {\n  position: fixed; z-index: 24; min-width: 200px; max-width: calc(100% - 20px); max-height: 70vh; overflow: auto;\n  background: var(--apple-now-playing-surface); border: 1px solid #80808044; border-radius: 12px; box-shadow: 0 8px 28px #0005; padding: 6px;\n}\n#apple-now-playing-page .apple-now-playing-queue-menu button {\n  display: block; padding: 10px 12px; border-radius: 6px; font-size: 13px; width: 100%; text-align: left;\n}\n#apple-now-playing-page .apple-now-playing-queue-menu button:hover { background: var(--apple-now-playing-hover); }\n#apple-now-playing-page .apple-now-playing-queue-item .apple-now-playing-queue-row { padding-right: 42px; }\n#apple-now-playing-page .apple-now-playing-queue-edit {\n  position: absolute; top: 12px; right: 3px; width: 32px; height: 32px; border-radius: 7px;\n}\n#apple-now-playing-page .apple-now-playing-queue-edit:hover { background: var(--apple-now-playing-hover); }\n#apple-now-playing-page .apple-now-playing-queue-item.drag-before { box-shadow: inset 0 2px var(--apple-now-playing-fg); }\n#apple-now-playing-page .apple-now-playing-queue-item.drag-after { box-shadow: inset 0 -2px var(--apple-now-playing-fg); }\n@media (max-height: 400px) {\n  #apple-now-playing-page[data-panel=\"none\"] .apple-now-playing-left {\n    width: min(100%, 650px); grid-template-columns: 40px minmax(0, 1fr) minmax(120px, 1fr);\n    align-items: center; gap: 6px 12px;\n  }\n  #apple-now-playing-page[data-panel=\"none\"] .apple-now-playing-cover { width: 40px; border-radius: 9px; font-size: 23px; }\n  #apple-now-playing-page[data-panel=\"none\"] .apple-now-playing-controls { display: contents; }\n  #apple-now-playing-page[data-panel=\"none\"] .apple-now-playing-meta { grid-column: 2; grid-row: 1; }\n  #apple-now-playing-page[data-panel=\"none\"] .apple-now-playing-timeline { grid-column: 3; grid-row: 1; }\n  #apple-now-playing-page[data-panel=\"none\"] .apple-now-playing-play-area { grid-column: 1 / 3; grid-row: 2; }\n  #apple-now-playing-page[data-panel=\"none\"] .apple-now-playing-volume { grid-column: 3; grid-row: 2; margin-top: 0; }\n}\n@media (prefers-reduced-motion: reduce) {\n  #apple-now-playing-page .apple-now-playing-backgrounds { transform: none; filter: none; }\n  #apple-now-playing-page[data-lyric-lift] .apple-now-playing-line:is(.current, .departing) :is(.apple-now-playing-word, .apple-now-playing-roman-word, .apple-now-playing-motion-glyph) { transform: none; }\n  #apple-now-playing-page .apple-now-playing-line:is(.current, .departing) .apple-now-playing-word-glow { opacity: var(--apple-now-playing-text-glow, 0); }\n}\n\n/* Stable layout and independent lyric reading effects. The outer row remains\n   owned by ViewportList; its measured height never includes visual scaling. */\n#apple-now-playing-page .apple-now-playing-original { display: block; line-height: 1.38; font-weight: 500; font-kerning: none; font-variant-ligatures: none; }\n#apple-now-playing-page[data-original-bold=\"true\"] .apple-now-playing-original { font-weight: 760; }\n#apple-now-playing-page .apple-now-playing-lyric-translation, #apple-now-playing-page .apple-now-playing-lyric-roman { font-weight: 400; line-height: 1.34; opacity: 1; }\n#apple-now-playing-page .apple-now-playing-reading-unit {\n  display: inline-flex; flex-direction: column; align-items: flex-start; vertical-align: top;\n  max-width: 100%; margin-inline-end: .045em;\n}\n#apple-now-playing-page .apple-now-playing-reading-unit > span { max-width: 100%; }\n#apple-now-playing-page .apple-now-playing-reading-unit > .apple-now-playing-lyric-roman { margin: -.04em 0 .32em; }\n#apple-now-playing-page .apple-now-playing-reading-unit .apple-now-playing-roman-word { white-space: normal; }\n#apple-now-playing-page .apple-now-playing-line-content {\n  display: block; transform-origin: left center;\n  transition: transform .35s ease, filter .38s ease, opacity .35s ease;\n}\n#apple-now-playing-page .apple-now-playing-line.right .apple-now-playing-line-content { transform-origin: right center; }\n#apple-now-playing-page .apple-now-playing-line:is(.current, .departing) .apple-now-playing-line-content { transition-property: transform; }\n#apple-now-playing-page[data-lyric-scale=\"true\"] .apple-now-playing-line:not(.current, .departing) .apple-now-playing-line-content { transform: scale(.98); }\n#apple-now-playing-page[data-lyric-fade=\"true\"] .apple-now-playing-line-content { opacity: var(--apple-now-playing-line-opacity, 1); }\n#apple-now-playing-page[data-lyric-fade=\"true\"] .apple-now-playing-lyrics { -webkit-mask-image: linear-gradient(transparent 0%,transparent 9%,rgba(0,0,0,.22) 17%,black 29%,black 70%,rgba(0,0,0,.18) 85%,transparent 94%,transparent 100%); }\n#apple-now-playing-page[data-lyric-fade=\"false\"] .apple-now-playing-lyrics, #apple-now-playing-page[data-lyric-browsing=\"true\"] .apple-now-playing-lyrics { -webkit-mask-image: none; }\n#apple-now-playing-page[data-lyric-blur=\"true\"] .apple-now-playing-line-content { filter: blur(var(--apple-now-playing-line-blur, 0)); }\n#apple-now-playing-page[data-lyric-browsing=\"true\"] .apple-now-playing-line-content { filter: none; opacity: 1; }\n@media (prefers-reduced-motion: reduce) {\n  #apple-now-playing-page .apple-now-playing-line-content, #apple-now-playing-page .apple-now-playing-lit { transition: none !important; }\n}\n\n/* Native dialogs retain their own component styles and event ownership. */\n#apple-now-playing-page .apple-now-playing-host-portal { position: fixed; top: 0; left: 0; width: 0; height: 0; z-index: 1000; pointer-events: none; }\n#apple-now-playing-page .apple-now-playing-host-portal[data-modal=\"true\"] { right: 0; bottom: 0; width: auto; height: auto; -webkit-app-region: no-drag; }\n#apple-now-playing-page .apple-now-playing-host-portal .cmd-portal { pointer-events: auto; -webkit-app-region: no-drag; }\n#apple-now-playing-page .apple-now-playing-host-portal [data-testid=\"tid_toast_wrapper\"] > * { -webkit-app-region: no-drag; }\n\n/* Settings keep category navigation outside the scrolling content. */\n#apple-now-playing-page .apple-now-playing-settings-panel {\n  width: min(508px, calc(100% - 28px)); right: 14px;\n  height: min(620px, calc(100% - 75px));\n  background: var(--apple-now-playing-settings-glass, var(--apple-now-playing-surface));\n  backdrop-filter: blur(26px) saturate(1.15);\n  border-color: var(--apple-now-playing-focus); border-radius: 18px;\n}\n#apple-now-playing-page .apple-now-playing-settings-panel[aria-hidden=\"true\"] { pointer-events: none; }\n#apple-now-playing-page .apple-now-playing-settings-panel .apple-now-playing-settings-header {\n  flex: none; padding: 13px 16px; border-bottom: 1px solid var(--apple-now-playing-hover);\n}\n#apple-now-playing-page .apple-now-playing-settings-panel .apple-now-playing-settings-header h2 { font-size: 18px; font-weight: 700; }\n#apple-now-playing-page .apple-now-playing-settings-panel .apple-now-playing-settings-header button {\n  font-size: 13px; font-weight: 600; color: var(--apple-now-playing-muted);\n  padding: 6px 11px; border-radius: 999px; background: var(--apple-now-playing-hover);\n}\n#apple-now-playing-page .apple-now-playing-settings-panel .apple-now-playing-settings-header .apple-now-playing-settings-close {\n  width: 30px; height: 30px; padding: 6px; border-radius: 50%;\n}\n#apple-now-playing-page .apple-now-playing-settings-close svg { width: 18px; height: 18px; }\n#apple-now-playing-page .apple-now-playing-settings-body {\n  display: grid; grid-template-columns: 112px minmax(0, 1fr); flex: 1; min-height: 0;\n}\n#apple-now-playing-page .apple-now-playing-settings-nav {\n  display: flex; flex-direction: column; gap: 4px; padding: 12px 8px;\n  min-height: 0; overflow: auto; border-right: 1px solid var(--apple-now-playing-hover);\n}\n#apple-now-playing-page .apple-now-playing-settings-nav button {\n  flex: none; min-height: 38px; padding: 9px 8px; text-align: left; border-radius: 9px;\n  font-size: 13px; font-weight: 500; color: var(--apple-now-playing-muted); white-space: nowrap;\n}\n#apple-now-playing-page .apple-now-playing-settings-nav button:hover { background: var(--apple-now-playing-hover); color: var(--apple-now-playing-fg); }\n#apple-now-playing-page .apple-now-playing-settings-nav button[aria-selected=\"true\"] {\n  color: var(--apple-now-playing-fg); background: var(--apple-now-playing-hover); font-weight: 650;\n}\n#apple-now-playing-page .apple-now-playing-preferences {\n  padding: 12px 16px 16px; font-size: 13px; font-weight: 500; overscroll-behavior: contain;\n}\n#apple-now-playing-page .apple-now-playing-settings-category h4 { margin: 24px 0 4px; font-size: 12px; color: var(--apple-now-playing-muted); }\n#apple-now-playing-page .apple-now-playing-setting-help { margin: 6px 0 12px; color: var(--apple-now-playing-muted); font-size: 12px; line-height: 1.6; }\n#apple-now-playing-page .apple-now-playing-preferences::-webkit-scrollbar { width: 4px; }\n#apple-now-playing-page .apple-now-playing-preferences::-webkit-scrollbar-thumb { background: var(--apple-now-playing-grip); border-radius: 8px; }\n#apple-now-playing-page .apple-now-playing-preferences .apple-now-playing-settings-card {\n  min-width: 0; margin: 0 0 12px; padding: 0;\n  border: 0; border-radius: 0; background: transparent;\n}\n#apple-now-playing-page .apple-now-playing-preferences .apple-now-playing-settings-card:last-child { margin-bottom: 0; }\n#apple-now-playing-page .apple-now-playing-preferences .apple-now-playing-settings-card legend {\n  width: 100%; padding: 0; margin: 0 0 4px;\n  font-size: 12px; font-weight: 600; line-height: 1.5; color: var(--apple-now-playing-muted);\n}\n#apple-now-playing-page .apple-now-playing-settings-card legend + * { clear: both; }\n#apple-now-playing-page .apple-now-playing-settings-card .apple-now-playing-pref-row { clear: both; min-height: 42px; padding: 9px 0; gap: 8px; }\n#apple-now-playing-page .apple-now-playing-settings-card .apple-now-playing-pref-row.is-disabled { opacity: .6; }\n#apple-now-playing-page .apple-now-playing-settings-card .apple-now-playing-pref-row + .apple-now-playing-pref-row { border-top: 1px solid var(--apple-now-playing-hover); }\n#apple-now-playing-page .apple-now-playing-settings-card .apple-now-playing-pref-row label { gap: 8px; }\n#apple-now-playing-page .apple-now-playing-settings-card .apple-now-playing-pref-row label > span { line-height: 1.45; }\n#apple-now-playing-page .apple-now-playing-settings-card .apple-now-playing-pref-row input[type=\"checkbox\"] {\n  appearance: none; -webkit-appearance: none; position: relative;\n  flex: none; width: 34px; height: 20px; margin: 0; padding: 0;\n  border: 0; border-radius: 999px; cursor: pointer; background: var(--apple-now-playing-track);\n  box-shadow: inset 0 0 0 1px var(--apple-now-playing-hover); transition: background-color .18s ease;\n}\n#apple-now-playing-page .apple-now-playing-settings-card .apple-now-playing-pref-row input[type=\"checkbox\"]::after {\n  content: \"\"; display: block; position: absolute; left: 2px; top: 2px;\n  width: 16px; height: 16px; border-radius: 50%; background: var(--apple-now-playing-muted);\n  box-shadow: 0 1px 3px #0003; transition: transform .18s ease, background-color .18s ease;\n}\n#apple-now-playing-page .apple-now-playing-settings-card .apple-now-playing-pref-row input[type=\"checkbox\"]:checked { background: var(--apple-now-playing-selected); }\n#apple-now-playing-page .apple-now-playing-settings-card .apple-now-playing-pref-row input[type=\"checkbox\"]:checked::after {\n  transform: translateX(14px); background: var(--apple-now-playing-selected-ink);\n}\n#apple-now-playing-page .apple-now-playing-settings-card .apple-now-playing-pref-row input:disabled { cursor: default; }\n#apple-now-playing-page .apple-now-playing-settings-card .apple-now-playing-pref-row select {\n  min-height: 28px; max-width: 155px; padding: 4px 8px; font-size: 12px;\n  background: var(--apple-now-playing-hover); border: 0; border-radius: 8px;\n}\n#apple-now-playing-page .apple-now-playing-settings-card .apple-now-playing-pref-row input[type=\"range\"] { width: 78px; accent-color: var(--apple-now-playing-muted); }\n#apple-now-playing-page .apple-now-playing-settings-card .apple-now-playing-pref-row input[type=\"range\"]::-webkit-slider-runnable-track { background: var(--apple-now-playing-track); }\n#apple-now-playing-page .apple-now-playing-settings-card .apple-now-playing-pref-value { font-size: 11px; min-width: 30px; text-align: right; color: var(--apple-now-playing-muted); }\n#apple-now-playing-page .apple-now-playing-settings-card .apple-now-playing-pref-row > button { padding: 4px; font-size: 10px; opacity: .85; }\n#apple-now-playing-page .apple-now-playing-settings-card .apple-now-playing-pref-segmented > label { flex: 1; }\n#apple-now-playing-page .apple-now-playing-settings-card .apple-now-playing-pref-segmented { flex-wrap: wrap; gap: 6px 10px; }\n#apple-now-playing-page .apple-now-playing-pref-segmented .apple-now-playing-segmented { flex-shrink: 0; }\n#apple-now-playing-page .apple-now-playing-segmented {\n  display: flex; align-items: stretch; padding: 2px; gap: 2px; border-radius: 9px;\n  background: var(--apple-now-playing-hover); min-width: 0; flex: 0 1 auto;\n}\n#apple-now-playing-page .apple-now-playing-segmented button {\n  flex: 0 0 auto; min-width: max-content; padding: 5px 8px; border-radius: 7px;\n  font-size: 11px; font-weight: 600; white-space: nowrap; color: var(--apple-now-playing-muted);\n}\n#apple-now-playing-page .apple-now-playing-segmented button[aria-checked=\"true\"] {\n  color: var(--apple-now-playing-selected-ink); background: var(--apple-now-playing-selected);\n  box-shadow: 0 1px 4px #0002;\n}\n#apple-now-playing-page .apple-now-playing-settings-card .apple-now-playing-pref-wide { flex-wrap: wrap; }\n#apple-now-playing-page .apple-now-playing-settings-card .apple-now-playing-pref-wide > label { flex-basis: 100%; }\n#apple-now-playing-page .apple-now-playing-settings-card .apple-now-playing-pref-wide .apple-now-playing-segmented { flex: 1 1 100%; }\n#apple-now-playing-page .apple-now-playing-settings-card .apple-now-playing-settings-actions { padding: 8px 0 0; }\n#apple-now-playing-page .apple-now-playing-settings-card .apple-now-playing-settings-actions button { flex: 1; padding: 8px 10px; font-size: 12px; }\n#apple-now-playing-page .apple-now-playing-settings-card .apple-now-playing-offset { gap: 1px; }\n#apple-now-playing-page .apple-now-playing-settings-card .apple-now-playing-offset button { padding: 5px 6px; font-size: 11px; }\n#apple-now-playing-page .apple-now-playing-settings-card .apple-now-playing-font-chooser { padding-bottom: 0; }\n#apple-now-playing-page .apple-now-playing-settings-card .apple-now-playing-font-chooser button { padding: 7px 9px; font-size: 12px; }\n#apple-now-playing-page .apple-now-playing-settings-card .apple-now-playing-font-chooser select { min-height: 30px; background: var(--apple-now-playing-hover); border: 0; border-radius: 8px; color: var(--apple-now-playing-fg); }\n#apple-now-playing-page .apple-now-playing-settings-card .apple-now-playing-font-status, #apple-now-playing-page .apple-now-playing-settings-card .apple-now-playing-audio-status { font-size: 11px; line-height: 1.5; }\n#apple-now-playing-page .apple-now-playing-settings-card .apple-now-playing-pref-row input[type=\"text\"] { min-width: 0; max-width: 190px; width: 54%; background: var(--apple-now-playing-hover); border-color: var(--apple-now-playing-hover); }\n@media (max-width: 380px) {\n  #apple-now-playing-page .apple-now-playing-settings-panel { right: 8px; width: calc(100% - 16px); }\n  #apple-now-playing-page .apple-now-playing-settings-card .apple-now-playing-pref-segmented { flex-wrap: wrap; }\n  #apple-now-playing-page .apple-now-playing-settings-card .apple-now-playing-pref-segmented > label { flex-basis: 100%; }\n  #apple-now-playing-page .apple-now-playing-settings-card .apple-now-playing-pref-segmented .apple-now-playing-segmented { flex: 1 1 100%; }\n  #apple-now-playing-page .apple-now-playing-settings-card .apple-now-playing-pref-row input[type=\"range\"] { width: 64px; }\n  #apple-now-playing-page .apple-now-playing-settings-card .apple-now-playing-pref-row select { max-width: 140px; }\n}\n@media (prefers-reduced-motion: reduce) {\n  #apple-now-playing-page .apple-now-playing-settings-card input[type=\"checkbox\"], #apple-now-playing-page .apple-now-playing-settings-card input[type=\"checkbox\"]::after { transition: none; }\n}\n\n\n/* Plugin-owned dropdowns stay inside the immersive page, above clipped cards. */\n#apple-now-playing-page .apple-now-playing-dropdown { display: inline-flex; min-width: 0; max-width: 100%; vertical-align: middle; }\n#apple-now-playing-page .apple-now-playing-pref-row label > .apple-now-playing-dropdown { flex: 0 1 auto; max-width: 165px; }\n#apple-now-playing-page .apple-now-playing-dropdown-trigger {\n  display: inline-flex; align-items: center; gap: 14px; justify-content: space-between;\n  min-width: 105px; min-height: 30px; max-width: 100%; padding: 5px 10px;\n  border-radius: 9px; background: var(--apple-now-playing-hover); color: var(--apple-now-playing-fg); font-size: 12px;\n}\n#apple-now-playing-page .apple-now-playing-dropdown-caption { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n#apple-now-playing-page .apple-now-playing-dropdown-trigger::after {\n  content: ''; flex: none; width: 7px; height: 7px; border-right: 1.5px solid currentColor;\n  border-bottom: 1.5px solid currentColor; transform: translateY(-2px) rotate(45deg); opacity: .85;\n}\n#apple-now-playing-page .apple-now-playing-dropdown-trigger:hover, #apple-now-playing-page .apple-now-playing-dropdown-trigger[aria-expanded=\"true\"] {\n  background: var(--apple-now-playing-track); color: var(--apple-now-playing-fg);\n}\n#apple-now-playing-page .apple-now-playing-dropdown-list {\n  position: fixed; z-index: 90; overflow: auto; overscroll-behavior: contain;\n  padding: 6px; border: 1px solid var(--apple-now-playing-focus); border-radius: 12px;\n  background: var(--apple-now-playing-surface); color: var(--apple-now-playing-fg);\n  backdrop-filter: blur(26px) saturate(1.15); box-shadow: 0 12px 32px #0005;\n  font-size: 13px; font-weight: 500; line-height: 1.35; -webkit-app-region: no-drag;\n}\n#apple-now-playing-page .apple-now-playing-dropdown-list::-webkit-scrollbar { width: 4px; }\n#apple-now-playing-page .apple-now-playing-dropdown-list::-webkit-scrollbar-thumb { background: var(--apple-now-playing-grip); border-radius: 8px; }\n#apple-now-playing-page .apple-now-playing-dropdown-list .apple-now-playing-dropdown-option {\n  display: flex; align-items: center; justify-content: space-between; gap: 12px;\n  width: 100%; min-height: 34px; padding: 8px 10px; border-radius: 7px;\n  text-align: left; color: var(--apple-now-playing-fg); white-space: normal; overflow-wrap: anywhere;\n}\n#apple-now-playing-page .apple-now-playing-dropdown-option[aria-selected=\"true\"]::after { content: '✓'; color: var(--apple-now-playing-muted); flex: none; }\n#apple-now-playing-page .apple-now-playing-dropdown-list .apple-now-playing-option-active { background: var(--apple-now-playing-hover); }\n#apple-now-playing-page .apple-now-playing-dropdown-option[aria-selected=\"true\"] { font-weight: 650; }\n#apple-now-playing-page .apple-now-playing-dropdown-list .apple-now-playing-option-active[aria-selected=\"true\"] { background: var(--apple-now-playing-selected); color: var(--apple-now-playing-selected-ink); }\n#apple-now-playing-page .apple-now-playing-dropdown-list .apple-now-playing-option-active[aria-selected=\"true\"]::after { color: inherit; }\n#apple-now-playing-page .apple-now-playing-font-chooser .apple-now-playing-dropdown { flex: 1 1 130px; }\n#apple-now-playing-page .apple-now-playing-font-chooser .apple-now-playing-dropdown-trigger { width: 100%; }\n#apple-now-playing-page .apple-now-playing-settings-card .apple-now-playing-pref-range {\n  display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px 12px;\n}\n#apple-now-playing-page .apple-now-playing-pref-range > label {\n  grid-column: 1 / -1; display: flex; flex-direction: column; align-items: stretch; width: 100%;\n}\n#apple-now-playing-page .apple-now-playing-settings-card .apple-now-playing-pref-range input[type=\"range\"] { width: 100%; }\n#apple-now-playing-page .apple-now-playing-settings-card .apple-now-playing-pref-range output { text-align: left; }\n#apple-now-playing-page .apple-now-playing-pref-text > label { flex-direction: column; align-items: stretch; }\n#apple-now-playing-page .apple-now-playing-settings-card .apple-now-playing-pref-text input[type=\"text\"] { width: 100%; max-width: none; }\n@media (max-width: 700px) {\n  #apple-now-playing-page .apple-now-playing-settings-body { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); }\n  #apple-now-playing-page .apple-now-playing-settings-nav {\n    flex-direction: row; flex-wrap: wrap; padding: 9px 12px; gap: 4px;\n    border-right: 0; border-bottom: 1px solid var(--apple-now-playing-hover);\n  }\n  #apple-now-playing-page .apple-now-playing-settings-nav button { min-height: 36px; padding: 8px 10px; font-size: 12px; text-align: center; }\n  #apple-now-playing-page .apple-now-playing-preferences { padding: 10px 14px 14px; }\n}\n@media (max-height: 500px) {\n  #apple-now-playing-page .apple-now-playing-settings-panel { top: 14px; max-height: calc(100% - 28px); height: calc(100% - 28px); }\n}\n/* Use rounded, theme-colored keyboard feedback instead of native white boxes. */\n#apple-now-playing-page :is(button, input, select, textarea, [tabindex]):where(:not(.apple-now-playing-host-portal *)):focus,\n#apple-now-playing-page :is(button, input, select, textarea, [tabindex]):where(:not(.apple-now-playing-host-portal *)):focus-visible {\n  outline: none !important; outline-offset: 0 !important;\n}\n#apple-now-playing-page :is(button, input, textarea):where(:not(.apple-now-playing-host-portal *)):focus-visible {\n  box-shadow: inset 0 0 0 1px var(--apple-now-playing-focus), 0 0 10px var(--apple-now-playing-hover);\n}\n#apple-now-playing-page .apple-now-playing-dropdown-list:focus { outline: none; }\n#apple-now-playing-launch:focus-visible { outline: none; box-shadow: 0 0 10px #ffffff35; }\n\n/* The embedded player measures and positions its own rows. */\n#apple-now-playing-page .apple-now-playing-lyrics { overflow: hidden; }\n#apple-now-playing-page .apple-now-playing-amll-host { position: absolute; inset: 0; }\n#apple-now-playing-page .apple-now-playing-extspotify {\n  --amll-lp-font-size: var(--apple-now-playing-font-size, clamp(24px, 3.15vw, 54px));\n  --amll-lp-color: var(--apple-now-playing-fg);\n  --amll-lp-hover-bg-color: var(--apple-now-playing-hover);\n  font-family: inherit;\n  font-weight: 500;\n}\n#apple-now-playing-page[data-original-bold=\"true\"] .apple-now-playing-extspotify .lyric_player_lyricMainLine { font-weight: 760; }\n#apple-now-playing-page .apple-now-playing-extspotify .anp-translation { font-size: var(--apple-now-playing-translation-size); }\n#apple-now-playing-page .apple-now-playing-extspotify .anp-roman { font-size: var(--apple-now-playing-roman-size); }\n#apple-now-playing-page .apple-now-playing-extspotify .lyric_player_lyricDuetLine { font-size: var(--apple-now-playing-duet-size); }\n#apple-now-playing-page .apple-now-playing-extspotify .anp-background-vocal { font-size: var(--apple-now-playing-background-vocal-size); }\n#apple-now-playing-page .apple-now-playing-extspotify [role=\"button\"]:focus-visible { outline: 2px solid currentColor; outline-offset: -3px; }\n#apple-now-playing-page .apple-now-playing-browse-rail {\n  position: absolute; inset: 8% 0 8% auto; width: 8px; overflow: hidden;\n  pointer-events: none; opacity: 0; touch-action: none; z-index: 2;\n}\n#apple-now-playing-page .apple-now-playing-browse-rail i {\n  position: absolute; right: 1px; top: var(--scroll-fraction, 0%); transform: translateY(calc(0% - var(--scroll-fraction, 0%)));\n  width: 3px; height: 9%; min-height: 16px; border-radius: 3px; background: currentColor;\n}\n#apple-now-playing-page .apple-now-playing-user-scrolling .apple-now-playing-browse-rail,\n#apple-now-playing-page .apple-now-playing-browse-rail:active { pointer-events: auto; opacity: .55; }\n#apple-now-playing-page .apple-now-playing-extspotify .anp-roman-timed { opacity: .75; }\n#apple-now-playing-page .apple-now-playing-extspotify .lyric_player_active > .anp-roman-timed { opacity: .90; }\n#apple-now-playing-page .apple-now-playing-extspotify .anp-roman-timed > span {\n  display: inline-block; white-space: pre; padding: .3em; margin: -.3em;\n}\n#apple-now-playing-page .apple-now-playing-extspotify .anp-grouped-readings {\n  display: flex; flex-wrap: wrap; align-items: flex-start; gap: .32em .22em;\n}\n#apple-now-playing-page .apple-now-playing-extspotify .lyric_player_lyricDuetLine > .anp-grouped-readings {\n  justify-content: flex-end;\n}\n#apple-now-playing-page .apple-now-playing-extspotify .anp-grouped-readings > .anp-reading-group {\n  /* shortcut: an overlong group stays intact, add fitting if it exceeds supported lyric widths. */\n  display: grid; grid-template-columns: max-content; justify-items: center; row-gap: .06em;\n  flex: none; margin: 0; padding: 0; white-space: nowrap; will-change: auto;\n}\n#apple-now-playing-page .apple-now-playing-extspotify :is(.anp-reading-base, .anp-reading-caption) {\n  display: block; text-align: center; white-space: nowrap;\n}\n#apple-now-playing-page .apple-now-playing-extspotify .anp-reading-base span:not(.anp-tail-ink) {\n  padding: 0; margin: 0; white-space: nowrap;\n}\n#apple-now-playing-page .apple-now-playing-extspotify .anp-reading-base > span:not(.anp-tail-ink) {\n  padding: .28em .035em; margin: -.28em 0; will-change: transform;\n}\n#apple-now-playing-page .apple-now-playing-extspotify .lyric_player_lyricMainLine span.anp-descender-space {\n  padding-bottom: .4em; margin-bottom: -.4em;\n}\n#apple-now-playing-page .apple-now-playing-extspotify .anp-reading-caption {\n  font-size: var(--apple-now-playing-roman-size, .64em); font-weight: 500; line-height: 1.3;\n  opacity: .38;\n}\n#apple-now-playing-page .apple-now-playing-extspotify .anp-reading-caption:is(.anp-reading-lit, .anp-reading-sweep) { opacity: .9; }\n#apple-now-playing-page .apple-now-playing-extspotify .anp-tail-ink {\n  display: inline-block;\n  will-change: text-shadow;\n  transition: text-shadow 0.25s ease-out;\n}\n@media (max-width: 760px) {\n  #apple-now-playing-page .apple-now-playing-extspotify {\n    --amll-lp-font-size: var(--apple-now-playing-font-size, clamp(22px, 5vw, 36px));\n  }\n}\n\n#apple-now-playing-page .apple-now-playing-preview-lyrics .amll-lyric-player {\n  --amll-lp-font-size: 17px;\n  height: auto;\n  min-height: 1.3em;\n  position: relative;\n  pointer-events: none;\n}\n#apple-now-playing-page .apple-now-playing-preview-lyrics .lyric_player_lyricLine {\n  position: relative;\n  width: 100%;\n  min-width: 0;\n  max-width: 100%;\n  padding: .15em 0;\n  transform: none !important;\n  filter: none !important;\n}\n#apple-now-playing-page .apple-now-playing-preview-lyrics .lyric_player_lyricDuetLine { font-size: 1em; }\n#apple-now-playing-page .apple-now-playing-preview-lyrics .anp-background-vocal { font-size: .78em; }\n#apple-now-playing-page .apple-now-playing-preview-lyrics :is(.lyric_player_interludeDots, .lyric_player_bottomLine) { display: none; }\n\n#apple-now-playing-page[data-lyric-lift=\"false\"] .apple-now-playing-extspotify :is(.lyric_player_lyricMainLine, .anp-roman-timed) span {\n  transform: none !important;\n}\n\n/* The renderer normally blurs rows inline. Clear the filter on the first\n   wheel/touch frame and restore the user's blur setting when following resumes. */\n#apple-now-playing-page[data-lyric-browsing=\"true\"] .apple-now-playing-amll-host .lyric_player_lyricLine {\n  filter: none !important;\n  transition: none !important;\n}\n#apple-now-playing-page .anp-reading-row .lyric_player_lyricMainLine > span:not(.anp-reading-group),\n#apple-now-playing-page .anp-reading-row .anp-reading-base,\n#apple-now-playing-page .anp-reading-row .anp-roman-timed > span { opacity: var(--dark-mask-alpha, .2); }\n#apple-now-playing-page .anp-reading-row .lyric_player_lyricMainLine span { will-change: auto; backface-visibility: visible; }\n#apple-now-playing-page[data-lyric-browsing=\"true\"] .anp-reading-row.anp-played-row .lyric_player_lyricMainLine > span:not(.anp-reading-group),\n#apple-now-playing-page[data-lyric-browsing=\"true\"] .anp-reading-row.anp-played-row .anp-reading-base,\n#apple-now-playing-page[data-lyric-browsing=\"true\"] .anp-reading-row.anp-played-row .anp-roman-timed > span { opacity: .85; }\n\n#apple-now-playing-page[data-text-shadow=\"true\"] .apple-now-playing-extspotify {\n  --anp-lyric-shadow: 0 .045em .085em rgba(0,0,0,.68);\n}\n#apple-now-playing-page[data-text-glow=\"true\"] .apple-now-playing-extspotify .lyric_player_active {\n  --anp-lyric-glow: 0 0 3px var(--apple-now-playing-word-halo);\n}\n#apple-now-playing-page:is([data-text-shadow=\"true\"], [data-text-glow=\"true\"]) .apple-now-playing-extspotify .lyric_player_lyricLine > div {\n  --anp-word-decoration: var(--anp-lyric-shadow, 0 0 transparent), var(--anp-lyric-glow, 0 0 transparent);\n  text-shadow: var(--anp-word-decoration);\n}\n";
    pageStyle = style;
    document.head.append(style);
    launcher = document.createElement('button');
    launcher.id = 'apple-now-playing-launch';
    launcher.type = 'button';
    launcher.title = '打开沉浸播放页（Ctrl+Shift+M）';
    launcher.setAttribute('aria-label', launcher.title);
    launcher.innerHTML = icon('music');
    launcher.addEventListener('click', () => open());
    document.body.append(launcher);
    updateLauncher();
    entryObserver = new MutationObserver(records => {
      if (!records.some(({ target }) => !page?.contains(target))) return;
      const flight = pageTransition?.flight;
      if (flight && host.coverEntry()?.querySelector('img') !== flight.thumbnail) settlePageTransition();
      updateLauncher();
    });
    entryObserver.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('click', handleVinyl, { capture: true, signal: lifetime.signal });
    window.addEventListener('pagehide', dispose, { once: true, signal: lifetime.signal });

    page = document.createElement('section');
    page.id = 'apple-now-playing-page';
    page.hidden = true;
    page.tabIndex = -1;
    page.setAttribute('role', 'dialog');
    page.setAttribute('aria-modal', 'true');
    page.setAttribute('aria-label', '沉浸播放页');
    page.innerHTML = `
      <div class="apple-now-playing-page-background" aria-hidden="true"><div class="apple-now-playing-backgrounds"><div class="apple-now-playing-backdrop on"></div><div class="apple-now-playing-backdrop"></div><canvas class="apple-now-playing-fluid" hidden></canvas></div></div>
      <div class="apple-now-playing-drag-bar" aria-hidden="true"></div>
      <button type="button" class="apple-now-playing-grip" data-action="close" aria-label="收起播放页" title="收起播放页（Esc）"></button>
      <div class="apple-now-playing-window-tools">
        ${button('settings', '播放页设置', 'settings', 'apple-now-playing-settings-button')}
        ${button('screen', '切换全屏', 'screen', 'apple-now-playing-screen')}
      </div>
      <div class="apple-now-playing-left">
        <div class="apple-now-playing-cover-slot"><div class="apple-now-playing-cover">${icon('music')}<img alt="" hidden></div></div>
        <div class="apple-now-playing-controls">
          <div class="apple-now-playing-meta">
            <div class="apple-now-playing-track"><button type="button" class="apple-now-playing-title" data-action="detail-song"></button><div class="apple-now-playing-alias" hidden></div><div class="apple-now-playing-sub"></div></div>
            ${button('favorite', '喜欢', 'heart', 'apple-now-playing-favorite')}
            ${button('menu', '更多', 'more')}

          </div>
          <div class="apple-now-playing-timeline">
            <input class="apple-now-playing-seek" type="range" min="0" max="1" value="0" step=".01" aria-label="播放进度">
            <div class="apple-now-playing-times">
              <span class="apple-now-playing-elapsed">0:00</span>
              <span class="apple-now-playing-loading" role="status" hidden>正在加载音频…</span>
              <span class="apple-now-playing-quality" aria-label="当前音质" hidden></span>
              <span class="apple-now-playing-remaining">-0:00</span>
            </div>
          </div>
          <div class="apple-now-playing-play-area">
          <div class="apple-now-playing-transport">
            ${button('mode', '播放模式', 'order', 'apple-now-playing-mode')}
            ${button('previous', '上一首', 'previous', 'apple-now-playing-skip')}
            ${button('play', '播放', 'play', 'apple-now-playing-play')}
            ${button('next', '下一首', 'next', 'apple-now-playing-skip')}
            ${button('queue', '播放队列', 'queue', 'apple-now-playing-queue-toggle')}
          </div>
          </div>
          <div class="apple-now-playing-volume">${icon('quiet')}
            <div class="apple-now-playing-volume-control">
              <input class="apple-now-playing-volume-input" type="range" min="0" max="1" value=".5" step=".01" aria-label="音量">
              <div class="apple-now-playing-volume-track" aria-hidden="true"><span class="apple-now-playing-volume-fill"></span></div>
            </div>
            ${icon('volume')}
          </div>
        </div>
      </div>
      <div class="apple-now-playing-right">
        <div class="apple-now-playing-panel-content">
        <div class="apple-now-playing-lyrics" tabindex="-1"><div class="apple-now-playing-amll-host" id="apple-now-playing-lyric-host"></div><div class="apple-now-playing-browse-rail" role="scrollbar" aria-label="浏览歌词" aria-orientation="vertical" aria-controls="apple-now-playing-lyric-host" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="-1"><i></i></div></div>
        <div class="apple-now-playing-status" role="status"></div>
        <div class="apple-now-playing-queue" aria-label="播放队列" tabindex="0" hidden>
          <div class="apple-now-playing-queue-header">
            <h2>播放队列</h2>
            <button type="button" data-action="host-queue">在网易云管理</button>
          </div>
          <div class="apple-now-playing-queue-source"></div>
          <div class="apple-now-playing-queue-scroll" tabindex="0" aria-label="队列歌曲">
            <div class="apple-now-playing-queue-list" role="list"></div>
          </div>
        </div>
        <div class="apple-now-playing-copy-view" hidden>
          <div class="apple-now-playing-copy-tools">
            <button type="button" data-action="copy-all">复制全部</button>
            <button type="button" data-action="select-all">全选</button>
            <button type="button" data-action="copy-view">返回歌词</button>
          </div>
          <textarea class="apple-now-playing-copy-text" readonly aria-label="可复制的歌词"></textarea>
        </div>
        </div>
      </div>
      <div class="apple-now-playing-menu" aria-label="当前曲目操作" hidden></div>
      <div class="apple-now-playing-row-menu" aria-label="歌词复制" hidden></div>
      <aside id="apple-now-playing-settings" class="apple-now-playing-settings-panel" role="dialog" aria-modal="true" aria-label="播放页设置" hidden>
        <div class="apple-now-playing-settings-header"><h2>播放页设置</h2>${button('close-settings', '关闭播放页设置', 'close', 'apple-now-playing-settings-close')}</div>
        <div class="apple-now-playing-settings-body">
        <nav class="apple-now-playing-settings-nav" role="tablist" aria-label="设置分类" aria-orientation="vertical"></nav>
        <div class="apple-now-playing-preferences">
          <fieldset class="apple-now-playing-lyric-settings">
            <legend>仅当前歌曲</legend>
            <p class="apple-now-playing-setting-help">每次调整 0.1 秒，按当前歌曲保存。</p>
            <div class="apple-now-playing-pref-row">
              <span class="apple-now-playing-pref-caption">当前歌曲偏移</span>
              <div class="apple-now-playing-offset" aria-label="当前歌曲歌词偏移">
                <button type="button" data-action="offset-ahead" aria-label="歌词提前 100 毫秒">提前</button>
                <output class="apple-now-playing-offset-value" aria-live="polite">0.0 s</output>
                <button type="button" data-action="offset-behind" aria-label="歌词延后 100 毫秒">延后</button>
                <button type="button" data-action="offset-reset" aria-label="重置当前歌曲歌词偏移">重置</button>
              </div>
            </div>
          </fieldset>
            <div class="apple-now-playing-settings-actions">
              <button type="button" data-action="source">歌词来源</button>
              <button type="button" data-action="refresh-lyrics" aria-describedby="apple-now-playing-lyric-refresh-hint">刷新本曲歌词</button>
              <p class="apple-now-playing-setting-help" id="apple-now-playing-lyric-refresh-hint">如果歌词未显示逐字动态效果，可以尝试刷新歌曲来源，重新获取支持逐字效果的歌词文件。</p>
              <p class="apple-now-playing-setting-help apple-now-playing-lyric-refresh-result" role="status" hidden></p>
            </div>
        </div>
        </div>
      </aside>
      <aside class="apple-now-playing-source-panel" role="dialog" aria-modal="true" aria-label="歌词来源详情" hidden>
        <div class="apple-now-playing-settings-header"><h2>歌词来源</h2><button type="button" data-action="close-source" aria-label="关闭歌词来源">完成</button></div>
        <div class="apple-now-playing-source-content"></div>
      </aside>
      <div class="apple-now-playing-queue-menu" aria-label="队列操作" hidden></div>
      <div class="apple-now-playing-preview" id="apple-now-playing-progress-preview" role="tooltip" hidden>
        <div class="apple-now-playing-preview-time"></div>
        <div class="apple-now-playing-preview-lyrics"></div>
        <div class="apple-now-playing-preview-status"></div>
      </div>
      <div class="apple-now-playing-toast" role="status" hidden></div>
      <div class="apple-now-playing-tabs">
        <div class="apple-now-playing-lyric-actions" role="group" aria-label="歌词显示">
          ${button('toggle-translation', '显示译文', 'translate')}
          ${button('toggle-karaoke', '显示逐字歌词', 'karaoke')}
          ${button('toggle-roman', '显示罗马音', 'roman')}
        </div>
        ${button('lyrics', '歌词', 'lyrics')}
      </div>`;
    document.body.append(page);

    const q = (name) => page.querySelector('.apple-now-playing-' + name);
    view = {
      backdrop: [...page.querySelectorAll('.apple-now-playing-backdrop')], cover: q('cover').querySelector('img'),
      pageBackground: q('page-background'), coverBox: q('cover'), meta: q('meta'), grip: q('grip'),
      pageControls: ['timeline', 'play-area', 'volume', 'window-tools', 'tabs'].map(q),
      left: q('left'), right: q('right'), panel: q('panel-content'), lyricsToggle: page.querySelector('[data-action="lyrics"]'),
      title: q('title'), alias: q('alias'), sub: q('sub'), quality: q('quality'), menu: q('menu'), seek: q('seek'), elapsed: q('elapsed'),
      remaining: q('remaining'), loading: q('loading'), play: q('play'), mode: q('mode'),
      favorite: q('favorite'), volume: q('volume-input'), volumeGroup: q('volume'), lyrics: q('lyrics'),
      lyricHost: q('amll-host'), browseBar: q('browse-rail'), status: q('status'), queue: q('queue'), queueList: q('queue-list'),
      queueScroll: q('queue-scroll'), queueSource: q('queue-source'), tools: q('lyric-actions'),
      offset: q('offset-value'), preview: q('preview'), copy: q('copy-view'), copyText: q('copy-text'),
      settings: q('settings-panel'), settingsToggle: q('settings-button'), preferences: q('preferences'), rowMenu: q('row-menu'), toast: q('toast'),
      lyricRefresh: { button: page.querySelector('[data-action="refresh-lyrics"]'), result: q('lyric-refresh-result') },
      fluid: q('fluid'), sourcePanel: q('source-panel'), sourceContent: q('source-content'), queueMenu: q('queue-menu'),
    };
    fluidRenderer = new AppleNowPlayingFluidBackground(view.fluid);
    lyricView = new window.AppleNowPlayingExtView(view.lyricHost, (_, node) => {
      if (closing || !snapshot?.can.seek) return;
      seek((Number(node.dataset.time) - currentOffset()) / 1000);
    }, (node, x, y) => showRowMenu(Number(node.dataset.index), x, y));
    queueView = new AppleNowPlayingViewportList(view.queueScroll, view.queueList, createQueueRow, item => item.kind === 'heading' ? 34 : 58);
    view.hostButtons = new Map(['play', 'previous', 'next', 'mode', 'favorite'].map(action =>
      [action, page.querySelector('[data-action="' + action + '"]')]));
    buildSettings();
    buildFontChooser();
    buildAudioStatus();
    view.settingsToggle.setAttribute('aria-controls', view.settings.id);
    view.settingsToggle.setAttribute('aria-expanded', 'false');
    applyPreferences();
    for (const layer of view.backdrop) {
      layer.addEventListener('transitionend', event => {
        if (event.propertyName === 'opacity') layer.classList.remove('apple-now-playing-fading');
      });
    }
    page.addEventListener('click', handleClick);
    page.addEventListener('pointermove', () => setControlsHidden(false), { passive: true });
    page.addEventListener('focusin', event => {
      if (panelFade?.outgoing && view.right.contains(event.target)) {
        view.lyricsToggle.focus({ preventScroll: true });
        return;
      }
      if (event.target.closest('.apple-now-playing-left, .apple-now-playing-settings-panel, .apple-now-playing-menu')) setControlsHidden(false);
    });
    view.lyrics.addEventListener('contextmenu', event => {
      if (event.defaultPrevented || !rawLyrics.length || event.target.closest('[data-action="lyric"]')) return;
      event.preventDefault();
      showRowMenu(-1, event.clientX, event.clientY);
    });
    view.lyrics.addEventListener('focusin', event => {
      const node = event.target.closest('[data-action="lyric"]');
      if (node) lyricFocus = Number(node.dataset.index);
    });
    view.queueList.addEventListener('contextmenu', event => {
      const button = event.target.closest('.apple-now-playing-queue-row');
      if (!button) return;
      event.preventDefault();
      showQueueMenu(button.dataset.resourceId, button.dataset.resourceType, event.clientX, event.clientY);
    });
    view.queueList.addEventListener('keydown', event => {
      if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return;
      const button = event.target.closest('.apple-now-playing-queue-row');
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      const rect = button.getBoundingClientRect();
      showQueueMenu(button.dataset.resourceId, button.dataset.resourceType, rect.left + 30, rect.top + 20);
    });
    view.queueList.addEventListener('dragstart', event => {
      const button = event.target.closest('.apple-now-playing-queue-row');
      if (!button?.draggable) return;
      queueDrag = { id: button.dataset.resourceId, type: button.dataset.resourceType, revision: host.queueRevision() };
      event.dataTransfer.setData('text/plain', queueDrag.id);
      event.dataTransfer.effectAllowed = 'move';
    });
    view.queueList.addEventListener('dragover', event => {
      const target = event.target.closest('.apple-now-playing-queue-row');
      if (queueDrag && target) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        for (const item of view.queueList.querySelectorAll('.drag-before, .drag-after')) item.classList.remove('drag-before', 'drag-after');
        const rect = target.getBoundingClientRect();
        target.parentElement.classList.add(event.clientY > rect.top + rect.height / 2 ? 'drag-after' : 'drag-before');
      }
    });
    view.queueList.addEventListener('drop', event => {
      const button = event.target.closest('.apple-now-playing-queue-row');
      if (!queueDrag || !button) return;
      event.preventDefault();
      const source = queueDrag;
      queueDrag = undefined;
      const rect = button.getBoundingClientRect();
      if (!host.mutateQueue('drop', source.id, source.type, button.dataset.resourceId, button.dataset.resourceType, source.revision, event.clientY > rect.top + rect.height / 2)) {
        notify('队列已变化，请重新操作或在网易云管理');
      }
      dirty = true;
    });
    view.queueList.addEventListener('dragend', () => {
      queueDrag = undefined;
      for (const item of view.queueList.querySelectorAll('.drag-before, .drag-after')) item.classList.remove('drag-before', 'drag-after');
    });
    bindPanelBrowsing(view.queueScroll);
    bindPanelBrowsing(view.lyrics);
    view.seek.addEventListener('pointermove', event => showPreview(event.clientX));
    view.seek.addEventListener('pointerleave', hidePreview);
    view.seek.addEventListener('blur', hidePreview);
    const dragBrowseRail = event => {
      if (event.type === 'pointermove' && !view.browseBar.hasPointerCapture(event.pointerId)) return;
      if (event.type === 'pointerdown') {
        if (event.button !== 0) return;
        view.browseBar.setPointerCapture(event.pointerId);
      }
      const rect = view.browseBar.getBoundingClientRect();
      const p = lyricView.player;
      const [min, max] = p.scrollBoundary;
      p.setBrowseOffset(min + clamp((event.clientY - rect.top) / rect.height, 0, 1) * (max - min));
      browseLyrics();
      event.preventDefault();
    };
    view.browseBar.addEventListener('pointerdown', dragBrowseRail);
    view.browseBar.addEventListener('pointermove', dragBrowseRail);
    view.lyrics.addEventListener('keydown', handleLyricKeys);
    view.seek.addEventListener('pointerdown', event => {
      if (!activity || event.button !== 0 || !snapshot?.can.seek) return;
      clearTimeout(dragEndTimer);
      pendingSeek = deferredSeek = seekAlignment = undefined;
      drag = { id: snapshot.id, pointer: event.pointerId, target: view.seek.valueAsNumber, changed: false };
    });
    view.seek.addEventListener('input', () => {
      const target = view.seek.valueAsNumber;
      if (drag) {
        if (drag.id !== snapshot?.id || drag.cancelled) return;
        drag.target = target;
        drag.changed = true;
      }
      renderTime(target, performance.now());
    });
    view.seek.addEventListener('change', () => {
      if (drag) {
        finishDrag();
      } else {
        seek(view.seek.valueAsNumber);
      }
    });
    view.volume.addEventListener('pointerdown', event => {
      if (activity && event.button === 0 && snapshot?.can.volume) {
        volumeGesture = { pointer: event.pointerId };
        view.volumeGroup.classList.add('is-adjusting');
      }
    });
    view.volume.addEventListener('input', () => {
      if (!activity) return;
      // Paint the native range and capsule before doing any host work.
      fillRange(view.volume);
      queueVolume(view.volume.valueAsNumber);
    });
    view.volume.addEventListener('change', finishVolumeGesture);
    view.volume.addEventListener('lostpointercapture', () => {
      if (volumeGesture) finishVolumeGesture();
    });
    window.addEventListener('blur', () => {
      if (volumeGesture) finishVolumeGesture();
    }, { signal: lifetime.signal });
    window.addEventListener('keydown', handleKeyboard, { capture: true, signal: lifetime.signal });
    document.addEventListener('fullscreenchange', syncFullScreen, { signal: lifetime.signal });
    document.addEventListener('visibilitychange', () => {
      if (page.hidden) return;
      if (document.hidden) {
        if (closing) finishClose();
        else {
          cancelPageTransition();
          stopActivity();
        }
      } else {
        startActivity();
      }
    }, { signal: lifetime.signal });
    reducedMotion.addEventListener('change', () => {
      settlePageTransition();
      if (settingsAnimation && reducedMotion.matches) setSettingsVisible(settingsOpen, true);
      cancelPanelSlide();
      cancelPanelFade();
      applyPreferences();
      syncAudioAnalysis();
    }, { signal: lifetime.signal });
  }

  function closeDropdown(returnFocus = false) {
    const previous = dropdown;
    if (!previous) return;
    dropdown = undefined;
    previous.scope.abort();
    previous.list.remove();
    previous.trigger.setAttribute('aria-expanded', 'false');
    if (returnFocus && previous.trigger.isConnected && !page.hidden) previous.trigger.focus({ preventScroll: true });
  }

  function dropdownActive(index) {
    if (!dropdown) return;
    const items = dropdown.items;
    dropdown.index = clamp(index, 0, items.length - 1);
    items.forEach((item, i) => item.classList.toggle('apple-now-playing-option-active', i === dropdown.index));
    const active = items[dropdown.index];
    if (active) {
      dropdown.list.setAttribute('aria-activedescendant', active.id);
      active.scrollIntoView({ block: 'nearest' });
    }
  }

  function handleDropdownKeyboard(event) {
    if (!dropdown) return false;
    if (event.key === 'Tab') { closeDropdown(true); return false; }
    const delta = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
    if (event.key === 'Escape') closeDropdown(true);
    else if (delta) dropdownActive((dropdown.index + delta + dropdown.items.length) % dropdown.items.length);
    else if (event.key === 'Home' || event.key === 'End') dropdownActive(event.key === 'Home' ? 0 : dropdown.items.length - 1);
    else if (event.key === 'Enter' || event.key === ' ') dropdown.items[dropdown.index]?.click();
    else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const prefix = event.key.toLocaleLowerCase();
      const start = dropdown.index + 1;
      for (let offset = 0; offset < dropdown.items.length; offset++) {
        const index = (start + offset) % dropdown.items.length;
        if (dropdown.items[index].textContent.trim().toLocaleLowerCase().startsWith(prefix)) { dropdownActive(index); break; }
      }
    } else return false;
    event.preventDefault();
    event.stopImmediatePropagation();
    return true;
  }

  function createDropdown(select, label) {
    select.hidden = true;
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');
    const element = document.createElement('span');
    element.className = 'apple-now-playing-dropdown';
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'apple-now-playing-dropdown-trigger';
    trigger.setAttribute('aria-label', label);
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    const caption = document.createElement('span');
    caption.className = 'apple-now-playing-dropdown-caption';
    trigger.append(caption);
    element.append(trigger);
    const sync = () => {
      caption.textContent = select.options[select.selectedIndex]?.textContent || select.options[0]?.textContent || '请选择';
      trigger.disabled = select.disabled || !select.options.length;
      trigger.title = caption.textContent;
    };
    select.addEventListener('change', sync);
    function open() {
      if (trigger.disabled) return;
      if (dropdown?.trigger === trigger) { closeDropdown(true); return; }
      closeDropdown();
      const list = document.createElement('div');
      list.className = 'apple-now-playing-dropdown-list';
      list.id = 'apple-now-playing-dropdown-' + (++dropdownSequence);
      list.tabIndex = -1;
      list.setAttribute('role', 'listbox');
      list.setAttribute('aria-label', label);
      trigger.setAttribute('aria-controls', list.id);
      trigger.setAttribute('aria-expanded', 'true');
      const scope = new AbortController();
      const options = [...select.options];
      const items = options.map((option, index) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.tabIndex = -1;
        item.className = 'apple-now-playing-dropdown-option';
        item.id = list.id + '-' + index;
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', String(option.selected));
        item.disabled = option.disabled;
        item.textContent = option.textContent;
        item.addEventListener('pointermove', () => { if (!item.disabled && dropdown?.list === list) dropdownActive(index); });
        item.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          if (item.disabled) return;
          select.value = option.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          sync();
          closeDropdown(true);
        });
        list.append(item);
        return item;
      });
      page.append(list);
      dropdown = { select, trigger, list, scope, items, index: Math.max(0, select.selectedIndex) };
      const rect = trigger.getBoundingClientRect();
      const below = innerHeight - rect.bottom - 18, above = rect.top - 18;
      const upward = below < Math.min(220, list.scrollHeight) && above > below;
      list.style.width = Math.min(Math.max(180, rect.width), innerWidth - 24) + 'px';
      list.style.maxHeight = Math.max(60, Math.min(320, upward ? above : below)) + 'px';
      list.style.left = clamp(rect.right - parseFloat(list.style.width), 12, innerWidth - parseFloat(list.style.width) - 12) + 'px';
      list.style.top = (upward ? Math.max(12, rect.top - list.offsetHeight - 6) : rect.bottom + 6) + 'px';
      list.focus({ preventScroll: true });
      dropdownActive(dropdown.index);
      document.addEventListener('pointerdown', event => {
        if (!list.contains(event.target) && !trigger.contains(event.target)) closeDropdown();
      }, { capture: true, signal: scope.signal });
      window.addEventListener('resize', () => closeDropdown(), { signal: scope.signal });
      window.addEventListener('scroll', event => { if (!list.contains(event.target)) closeDropdown(); }, { capture: true, signal: scope.signal });
      list.addEventListener('click', event => event.stopPropagation());
    }
    trigger.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); open(); });
    trigger.addEventListener('keydown', event => {
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      open();
      if (dropdown) dropdownActive(event.key === 'Home' ? 0 : event.key === 'End' ? dropdown.items.length - 1 : dropdown.index);
    });
    sync();
    return { element, trigger, sync };
  }

  function buildSettings() {
    view.prefFields = new Map();
    view.settingsCategories = new Map();
    view.settingsGroups = new Map();
    const categories = [
      { id: 'appearance', label: '页面外观', groups: [
        { keys: ['display', 'alias'] },
        { id: 'shadows', label: '阴影与辉光', keys: ['coverShadow', 'textShadow', 'textGlow'] },
      ] },
      { id: 'background', label: '背景效果', groups: [
        { keys: ['background', 'motion', 'gradientDim', 'blur', 'blurDim', 'audioReactive'] },
        { id: 'fluid', label: '画质与性能', keys: ['fluidQuality', 'fluidFps'] },
      ] },
      { id: 'reading', label: '歌词与字体', groups: [
        { keys: ['translation', 'roman', 'karaoke', 'romanKaraoke'] },
        { label: '字号与排版', keys: ['fontSize', 'alignment', 'translationSize', 'romanSize', 'backgroundVocalSize', 'duetSize', 'originalBold'] },
        { label: '浏览与预览', keys: ['scrollbar', 'preview'] },
        { label: '字体', keys: ['customFont', 'fontPreset'] },
        { id: 'fonts', label: '进阶字体设置', keys: ['fontFamilies'] },
      ] },
      { id: 'motion', label: '歌词动效', groups: [
        { keys: ['lyricLift', 'scrollStyle'] },
        { label: '歌词效果', keys: ['lyricFade', 'lyricScale', 'lyricBlur'] },
      ] },
      { id: 'tools', label: '同步与工具', groups: [
        { id: 'global', label: '所有歌曲的偏移', keys: ['globalOffset'] },
      ] },
      { id: 'experimental', label: '实验性功能',
        description: '抢先体验仍在开发和测试中的新功能。这些功能可能尚不稳定，并可能在后续版本中调整或移除。',
        groups: [{ keys: ['romanGrouping'] }] },
    ];
    const tools = view.preferences.querySelector('.apple-now-playing-lyric-settings');
    tools.classList.add('apple-now-playing-settings-card');
    const actions = view.preferences.querySelector('.apple-now-playing-settings-actions');
    const navigation = view.settings.querySelector('.apple-now-playing-settings-nav');
    const labels = {
      alias: '歌曲别名与译名',
      scrollStyle: '歌词滚动方式', alignment: '当前歌词位置', lyricFade: '歌词渐隐',
      lyricScale: '歌词缩放', lyricBlur: '歌词模糊', background: '背景类型',
      globalOffset: '所有歌曲的歌词偏移', translationSize: '译文大小', romanSize: '罗马音大小',
    };
    const shortNames = {
      display: { all: '封面与歌词' },
      fluidQuality: { low: '性能', balanced: '均衡', high: '精细' },
    };
    for (const category of categories) {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.id = 'apple-now-playing-settings-tab-' + category.id;
      tab.dataset.settingsCategory = category.id;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', 'apple-now-playing-settings-' + category.id);
      tab.textContent = category.label;
      tab.addEventListener('click', () => selectSettingsCategory(category.id));
      navigation.append(tab);
      const panel = document.createElement('section');
      panel.className = 'apple-now-playing-settings-category';
      panel.id = 'apple-now-playing-settings-' + category.id;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tab.id);
      panel.hidden = true;
      view.preferences.append(panel);
      view.settingsCategories.set(category.id, { tab, panel, scrollTop: 0 });
      if (category.description) {
        const description = document.createElement('p');
        description.id = panel.id + '-description';
        description.className = 'apple-now-playing-setting-help';
        description.textContent = category.description;
        panel.setAttribute('aria-describedby', description.id);
        panel.append(description);
      }
      if (category.id === 'tools') panel.append(tools);
      if (category.id === 'motion') {
        view.settingsMotionNotice = document.createElement('p');
        view.settingsMotionNotice.className = 'apple-now-playing-setting-help';
        panel.append(view.settingsMotionNotice);
      }
      for (const group of category.groups) {
        const fieldset = document.createElement('fieldset');
        fieldset.className = 'apple-now-playing-settings-card';
        if (group.label) {
          const legend = document.createElement('legend');
          legend.textContent = group.label;
          fieldset.append(legend);
        }
        panel.append(fieldset);
        if (group.id) view.settingsGroups.set(group.id, fieldset);
        for (const key of group.keys) {
          const definition = settingDefinitions.find(item => item.key === key);
          if (!definition) continue;
          const row = document.createElement('div');
          row.className = 'apple-now-playing-pref-row';
          const label = document.createElement('label');
          const caption = document.createElement('span');
          caption.textContent = labels[key] || definition.label;
          let input, segments, picker;
          if (definition.options) {
            input = document.createElement('select');
            for (const [value, name] of definition.options) input.add(new Option(name, value));
            if (definition.options.length <= 3 && key !== 'scrollStyle') {
              input.hidden = true;
              input.tabIndex = -1;
              input.setAttribute('aria-hidden', 'true');
              const segmented = document.createElement('div');
              segmented.className = 'apple-now-playing-segmented';
              segmented.setAttribute('role', 'radiogroup');
              segmented.setAttribute('aria-label', definition.label);
              segments = definition.options.map(([value, name]) => {
                const segment = document.createElement('button');
                segment.type = 'button';
                segment.setAttribute('role', 'radio');
                segment.setAttribute('aria-label', name);
                segment.dataset.option = value;
                segment.textContent = shortNames[definition.key]?.[value] || name;
                segment.title = name;
                segment.addEventListener('click', () => {
                  input.value = value;
                  input.dispatchEvent(new Event('change', { bubbles: true }));
                });
                segmented.append(segment);
                return segment;
              });
              segmented.addEventListener('keydown', event => {
                const index = segments.indexOf(event.target);
                if (index < 0) return;
                const delta = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 :
                  ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 0;
                if (!delta && !['Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                event.stopPropagation();
                const next = event.key === 'Home' ? 0 : event.key === 'End' ? segments.length - 1 :
                  (index + delta + segments.length) % segments.length;
                segments[next].click();
                segments[next].focus({ preventScroll: true });
              });
              row.classList.add('apple-now-playing-pref-segmented');
              row.append(segmented);
            } else {
              picker = createDropdown(input, definition.label);
            }
          } else {
            input = document.createElement('input');
            input.type = definition.kind === 'text' ? 'text' : typeof definition.value === 'boolean' ? 'checkbox' : 'range';
            if (definition.kind === 'text') input.maxLength = 512;
            if (input.type === 'range') {
              input.min = definition.min;
              input.max = definition.max;
              input.step = definition.step;
            }
          }
          input.dataset.preference = definition.key;
          input.setAttribute('aria-label', definition.label);
          if (input.type === 'checkbox') input.setAttribute('role', 'switch');
          const output = document.createElement('output');
          output.className = 'apple-now-playing-pref-value';
          const update = () => setPreference(definition.key, input.type === 'checkbox' ? input.checked :
            input.type === 'range' ? input.valueAsNumber : input.value);
          input.addEventListener(input.type === 'range' ? 'input' : 'change', update);
          label.append(caption, input);
          if (picker) label.append(picker.element);
          row.prepend(label);
          let reset;
          if (input.type === 'range') {
            row.classList.add('apple-now-playing-pref-range');
            row.append(output);
            reset = document.createElement('button');
            reset.type = 'button';
            reset.textContent = '重置';
            reset.setAttribute('aria-label', '重置' + definition.label);
            reset.addEventListener('click', () => setPreference(definition.key, definition.value));
            row.append(reset);
          }
          fieldset.append(row);
          if (definition.kind === 'text') row.classList.add('apple-now-playing-pref-text');
          view.prefFields.set(definition.key, { row, input, output, segments, picker, reset });
        }
        if (group.id === 'global') {
          const hint = document.createElement('p');
          hint.className = 'apple-now-playing-setting-help';
          hint.textContent = '总偏移等于当前歌曲偏移加上所有歌曲偏移。';
          fieldset.append(hint);
        }
      }
      if (category.id === 'tools') {
        const title = document.createElement('h4');
        title.textContent = '歌词工具';
        panel.append(title, actions);
      }
    }
    navigation.addEventListener('keydown', event => {
      const tab = event.target.closest('[data-settings-category]');
      if (!tab) return;
      const tabs = [...navigation.querySelectorAll('button')];
      const index = tabs.indexOf(tab);
      const direction = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 :
        ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 0;
      if (!direction && !['Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 :
        (index + direction + tabs.length) % tabs.length;
      tabs[next].click();
      tabs[next].focus({ preventScroll: true });
    });
    const updateOrientation = () => navigation.setAttribute('aria-orientation', innerWidth <= 700 ? 'horizontal' : 'vertical');
    updateOrientation();
    window.addEventListener('resize', updateOrientation, { signal: lifetime.signal });
    selectSettingsCategory('appearance');
  }

  function selectSettingsCategory(id) {
    if (!view.settingsCategories.has(id)) return;
    closeDropdown();
    const previous = view.settingsCategories.get(view.settingsCategory);
    if (previous) previous.scrollTop = view.preferences.scrollTop;
    view.settingsCategory = id;
    for (const [key, category] of view.settingsCategories) {
      const selected = key === id;
      category.panel.hidden = !selected;
      category.tab.setAttribute('aria-selected', String(selected));
      category.tab.tabIndex = selected ? 0 : -1;
    }
    view.preferences.scrollTop = view.settingsCategories.get(id).scrollTop;
    if (id === 'reading' && settingsOpen && view.fontPicker && preferences.customFont && !fontsLoaded) loadFonts();
  }

  function buildFontChooser() {
    const fieldset = view.prefFields.get('fontFamilies').row.parentElement;
    const chooser = document.createElement('div');
    chooser.className = 'apple-now-playing-font-chooser';
    view.fontChooser = chooser;
    view.fontPicker = document.createElement('select');
    view.fontPicker.setAttribute('aria-label', '本机字体');
    view.fontPicker.add(new Option('读取本机字体后选择', ''));
    menuButton(chooser, 'load-fonts', '读取本机字体');
    view.fontDropdown = createDropdown(view.fontPicker, '本机字体');
    chooser.append(view.fontPicker, view.fontDropdown.element);
    menuButton(chooser, 'add-font', '添加到回退末尾');
    view.fontStatus = document.createElement('div');
    view.fontStatus.className = 'apple-now-playing-font-status';
    view.fontStatus.setAttribute('role', 'status');
    view.fontStatus.textContent = '按从左到右的顺序回退，缺少字符时使用后续字体。';
    chooser.append(view.fontStatus);
    fieldset.append(chooser);
  }

  function applyFontFamilies() {
    const families = preferences.fontFamilies.split(/[,，]/).map(name => name.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    if (preferences.customFont && families.length) {
      page.style.fontFamily = [...new Set(families)].map(name => JSON.stringify(name)).join(',') + ',"Segoe UI","Microsoft YaHei UI",sans-serif';
    } else {
      page.style.removeProperty('font-family');
    }
  }

  async function loadFonts() {
    if (!activity) return;
    const generation = ++fontRequest;
    text(view.fontStatus, '正在读取本机字体…');
    const names = await host.fonts();
    if (!activity || generation !== fontRequest) return;
    if (dropdown?.select === view.fontPicker) closeDropdown(true);
    view.fontPicker.replaceChildren();
    view.fontPicker.add(new Option('选择字体', ''));
    for (const name of names) view.fontPicker.add(new Option(name, name));
    view.fontDropdown.sync();
    fontsLoaded = names.length > 0;
    text(view.fontStatus, fontsLoaded ? names.length + ' 个本机字体，可加入有序回退列表。' : '当前无法读取字体列表，可输入已安装字体名称或使用预设。');
  }

  function addSelectedFont() {
    const name = view.fontPicker.value;
    if (!name) return;
    const families = preferences.fontFamilies.split(/[,，]/).map(value => value.trim()).filter(Boolean);
    if (!families.includes(name)) families.push(name);
    setPreference('fontFamilies', families.join(', '));
  }

  function buildAudioStatus() {
    view.audioStatus = document.createElement('div');
    view.audioStatus.className = 'apple-now-playing-audio-status';
    view.audioStatus.setAttribute('role', 'status');
    view.prefFields.get('audioReactive').row.insertAdjacentElement('afterend', view.audioStatus);
    text(view.audioStatus, audioStatus);
  }

  function setAudioStatus(value) {
    audioStatus = value;
    if (!view.audioStatus) return;
    const dynamic = ['gradient', 'blur', 'fluid'].includes(preferences.background);
    const unavailable = snapshot && !snapshot.can.audioAnalysis;
    const field = view.prefFields.get('audioReactive');
    field.input.disabled = !dynamic || reducedMotion.matches || !!unavailable;
    field.row.classList.toggle('is-disabled', field.input.disabled);
    view.audioStatus.hidden = dynamic && !reducedMotion.matches && !unavailable && !preferences.audioReactive;
    text(view.audioStatus, !dynamic ? '当前背景保持静态，切换到动态背景可启用音乐律动。' :
      reducedMotion.matches ? '系统已启用减少动态效果，背景保持静态。' :
        unavailable ? '当前网易云版本没有可用的音频分析通道。' : value);
  }

  function stopAudioAnalysis() {
    audioOff?.();
    audioOff = undefined;
    audioTrack = undefined;
    audioTarget = audioPulse = audioStamp = audioVisualAt = 0;
    lowPass = lowEnvelope = 0;
    page.style.setProperty('--apple-now-playing-audio-pulse', '0');
    setAudioStatus('音频律动已关闭');
  }

  function consumeAudioData(packets) {
    // Verified Windows 3.1.41 contract: 48 kHz, stereo, packed signed16 LE PCM.
    // This is host-provided analysis input; the plugin does not decode or play it.
    if (!activity || !Array.isArray(packets)) return;
    for (const packet of packets) {
      if (!Number.isFinite(packet?.pts)) continue;
      const data = packet.data;
      const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : ArrayBuffer.isView(data) ?
        new Uint8Array(data.buffer, data.byteOffset, data.byteLength) : undefined;
      if (!bytes?.byteLength || bytes.byteLength % 4) continue;
      const samples = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      let energy = 0, count = 0;
      const alpha = 1 - Math.exp(-2 * Math.PI * 180 / 48000);
      for (let offset = 0; offset < samples.byteLength; offset += 4) {
        const mono = (samples.getInt16(offset, true) + samples.getInt16(offset + 2, true)) / 65536;
        lowPass += alpha * (mono - lowPass);
        energy += lowPass * lowPass;
        count++;
      }
      const bass = Math.sqrt(energy / Math.max(1, count));
      lowEnvelope = lowEnvelope * .9 + bass * .1;
      const beat = Math.max(0, bass - lowEnvelope * 1.1);
      audioTarget = clamp(bass * 5 + beat * 12, 0, 1);
      audioStamp = performance.now();
      setAudioStatus('正在分析网易云音频数据');
    }
  }

  function syncAudioAnalysis() {
    setAudioStatus(audioStatus);
    if (!activity || !preferences.audioReactive) {
      if (audioOff || audioPulse) stopAudioAnalysis();
      return;
    }
    const dynamic = ['gradient', 'blur', 'fluid'].includes(preferences.background);
    if (!dynamic || reducedMotion.matches || !snapshot?.playing || snapshot.loading) {
      if (audioOff || audioPulse) stopAudioAnalysis();
      setAudioStatus(!dynamic || reducedMotion.matches ? '当前背景使用静态显示' : '暂停或加载时保持普通背景');
      return;
    }
    const track = snapshot.playId || snapshot.id;
    if (audioOff && audioTrack === track) return;
    stopAudioAnalysis();
    audioTrack = track;
    audioOff = host.watchAudio(consumeAudioData, setAudioStatus);
  }

  function paintAudioBackground(time) {
    if (!preferences.audioReactive || !audioOff) return;
    const elapsed = audioVisualAt ? Math.min(100, time - audioVisualAt) : 16;
    audioVisualAt = time;
    const fresh = audioStamp && time - audioStamp < 1200;
    const target = fresh ? audioTarget : 0;
    const next = audioPulse + (target - audioPulse) * (1 - Math.exp(-elapsed / 120));
    if (Math.abs(next - audioPulse) > .0005) {
      audioPulse = next;
      page.style.setProperty('--apple-now-playing-audio-pulse', audioPulse.toFixed(3));
    }
    if (!fresh && audioStamp && audioStatus.startsWith('正在分析')) setAudioStatus('分析数据暂不可用，背景保持常规');
  }

  function extractNativeContributors(payload) {
    return [['lyricUser', '歌词'], ['transUser', '译文'], ['yrcUser', '逐字歌词'], ['ytlrcUser', '逐字译文']]
      .filter(([field]) => payload[field]?.nickname)
      .map(([field, role]) => ({
        role, name: String(payload[field].nickname), id: payload[field].userid || payload[field].uid || '',
      }));
  }

  function extractTtmlMetadata(raw) {
    const xml = new DOMParser().parseFromString(raw, 'application/xml');
    if (xml.getElementsByTagName('parsererror').length) return [];
    return byTag(xml, 'meta').map(element => ({
      key: element.getAttribute('key') || element.getAttribute('name') || '',
      value: element.getAttribute('value') || element.textContent.trim(),
    })).filter(item => /author|contribut|github|translat/i.test(item.key) && item.value);
  }

  function showSourceDetails() {
    const origin = settingsOpen ? view.settingsToggle : document.activeElement;
    closePopups();
    popupFocus = origin;
    view.sourcePanel.hidden = false;
    renderSourceDetails();
    view.sourcePanel.querySelector('button').focus();
  }

  function renderSourceDetails() {
    if (!view?.sourcePanel || view.sourcePanel.hidden) return;
    view.sourceContent.replaceChildren();
    const entry = (label, value) => {
      if (!value) return;
      const row = document.createElement('div');
      row.className = 'apple-now-playing-source-entry';
      const title = document.createElement('strong');
      title.textContent = label;
      const content = document.createElement('span');
      content.textContent = value;
      row.append(title, content);
      view.sourceContent.append(row);
    };
    entry('当前来源', lyricSource);
    entry('自定义来源', lyricDetails.customSourceName);
    entry('AMLL 取词节点', lyricDetails.mirror);
    entry('来源地址', lyricDetails.url || '');
    entry('字段补充', (lyricDetails.supplements || []).join('、'));
    entry('总歌词偏移', (currentOffset() / 1000).toFixed(1) + ' s（全局 ' +
      (preferences.globalOffset / 1000).toFixed(1) + ' s，当前曲 ' + (currentSongOffset() / 1000).toFixed(1) + ' s）');
    for (const contributor of lyricDetails.contributors || []) {
      entry('网易云' + contributor.role + '贡献者', contributor.name + (contributor.id ? '（' + contributor.id + '）' : ''));
    }
    for (const item of lyricDetails.metadata || []) {
      entry(/author/i.test(item.key) ? 'TTML 制作 · ' + item.key : item.key, item.value);
    }
    if (!lyricDetails.contributors?.length && !lyricDetails.metadata?.length) entry('贡献者', '当前来源未提供贡献者资料');
  }

  function setPreference(key, value) {
    const definition = settingDefinitions.find(item => item.key === key);
    if (!definition) return;
    preferences[key] = settingValue(definition, value);
    if (key === 'roman') preferences.romanKaraoke = preferences.roman;
    if (key === 'fontPreset') {
      const presets = {
        misans: ['MiSans', 'MiSans VF'],
        'source-sans': ['思源黑体', 'Source Han Sans SC', 'Noto Sans CJK SC'],
        'source-serif': ['思源宋体', 'Source Han Serif SC', 'Noto Serif CJK SC'],
        pingfang: ['PingFang SC', '苹方-简'],
        yahei: ['Microsoft YaHei UI', '微软雅黑'],
        jhenghei: ['Microsoft JhengHei', '微軟正黑體'],
      };
      if (presets[value]) preferences.fontFamilies = presets[value].join(', ');
      preferences.customFont = value !== 'system';
    }
    if (key === 'fontFamilies') {
      preferences.fontPreset = 'custom';
      preferences.customFont = !!preferences.fontFamilies;
    }
    if (!saveObject(preferencesKey, preferences)) notify('偏好暂时无法保存');
    applyPreferences(key);
    if (key === 'customFont' && preferences.customFont && settingsOpen && !fontsLoaded) loadFonts();
  }

  function applyPreferences(changed) {
    page.dataset.background = preferences.background;
    page.dataset.motion = String(preferences.motion);
    page.dataset.scrollbar = String(preferences.scrollbar);
    if (!preferences.scrollbar) clearLyricScrollIndicator();
    page.dataset.coverShadow = String(preferences.coverShadow);
    page.dataset.textShadow = String(preferences.textShadow);
    page.dataset.textGlow = String(preferences.textGlow);
    page.dataset.audioReactive = String(preferences.audioReactive);
    page.dataset.lyricLift = String(preferences.lyricLift && !reducedMotion.matches);
    page.dataset.originalBold = String(preferences.originalBold);
    page.dataset.lyricFade = String(preferences.lyricFade);
    page.dataset.lyricScale = String(preferences.lyricScale && !reducedMotion.matches);
    page.dataset.lyricBlur = String(preferences.lyricBlur && !reducedMotion.matches);
    view.fluid.hidden = !['fluid', 'fluid-static'].includes(preferences.background);
    applyFontFamilies();
    fluidRenderer.invalidate();
    page.style.setProperty('--apple-now-playing-font-size', preferences.fontSize === 'auto' ? '' : preferences.fontSize + 'px');
    page.style.setProperty('--apple-now-playing-translation-size', preferences.translationSize / 100 + 'em');
    page.style.setProperty('--apple-now-playing-roman-size', preferences.romanSize / 100 + 'em');
    page.style.setProperty('--apple-now-playing-background-vocal-size', preferences.backgroundVocalSize + 'px');
    page.style.setProperty('--apple-now-playing-duet-size', preferences.duetSize + 'px');
    page.style.setProperty('--apple-now-playing-background-blur', preferences.blur + 'px');
    const dim = preferences.background === 'gradient' ? preferences.gradientDim :
      preferences.background === 'blur' ? preferences.blurDim : 0;
    page.style.setProperty('--apple-now-playing-background-dim', dim / 100);
    for (const definition of settingDefinitions) {
      const field = view.prefFields.get(definition.key);
      const key = definition.key;
      const hidden = (!!definition.when && !(Array.isArray(definition.when) ? definition.when : [definition.when]).includes(preferences.background)) ||
        (key === 'translationSize' && !preferences.translation) || (key === 'romanSize' && !preferences.roman) ||
        (['fontPreset', 'fontFamilies'].includes(key) && !preferences.customFont);
      if (hidden && (field.row.contains(document.activeElement) || dropdown?.select === field.input)) {
        closeDropdown();
        view.settingsCategories.get(view.settingsCategory)?.tab.focus({ preventScroll: true });
      }
      field.row.hidden = hidden;
      const disabled = (key === 'lyricLift' && (!preferences.karaoke || reducedMotion.matches)) ||
        (key === 'audioReactive' && (reducedMotion.matches || !['gradient', 'blur', 'fluid'].includes(preferences.background)));
      field.input.disabled = disabled;
      field.row.classList.toggle('is-disabled', disabled);
      if (field.reset) field.reset.disabled = disabled;
      if (field.input.type === 'checkbox') field.input.checked = preferences[definition.key];
      else field.input.value = preferences[definition.key];
      for (const segment of field.segments || []) {
        const selected = segment.dataset.option === String(preferences[definition.key]);
        segment.setAttribute('aria-checked', String(selected));
        segment.tabIndex = selected ? 0 : -1;
        segment.disabled = disabled;
      }
      field.picker?.sync();
      if (dropdown?.select === field.input && field.row.hidden) closeDropdown();
      field.output.textContent = preferences[definition.key] + (definition.unit ? ' ' + definition.unit : definition.key.includes('Size') ? '%' : '');
    }
    view.fontChooser.hidden = !preferences.customFont;
    view.settingsGroups.get('fonts').hidden = !preferences.customFont;
    view.settingsGroups.get('fluid').hidden = !['fluid', 'fluid-static'].includes(preferences.background);
    view.settingsMotionNotice.hidden = preferences.karaoke && !reducedMotion.matches;
    text(view.settingsMotionNotice, !preferences.karaoke ? '开启逐字后可使用歌词上浮。' :
      '系统已启用减少动态效果，歌词字形保持固定。');
    setAudioStatus(audioStatus);
    if (changed === 'display') {
      showTab(preferences.display === 'cover' ? 'none' : 'lyrics');
    } else {
      updateDisplayMode();
    }
    if (!changed || changed === 'background') coverKey = undefined;
    lyricView.configure(preferences, reducedMotion.matches);
    if (['karaoke', 'translation', 'roman', 'romanKaraoke', 'romanGrouping'].includes(changed)) {
      renderLyrics();
      if (previewPosition) showPreview(previewPosition.x);
    } else if (['fontSize', 'translationSize', 'romanSize', 'backgroundVocalSize', 'duetSize', 'originalBold',
        'customFont', 'fontPreset', 'fontFamilies'].includes(changed)) {
      lyricView.player.onResize();
    } else if (changed === 'scrollStyle' || changed === 'alignment') {
      positionLyrics();
    }
    if (changed === 'globalOffset') {
      const now = performance.now();
      syncLyrics(playbackTime(now), now, false);
      if (previewPosition) showPreview(previewPosition.x);
      renderSourceDetails();
    }
    if (changed === 'audioReactive' || changed === 'background') syncAudioAnalysis();
    if (changed === 'alias') metadataSignature = '';
    if (copyMode) updateCopyText();
    updateLyricTools();
    if (!preferences.preview) hidePreview();
    dirty = true;
  }

  function updateDisplayMode() {
    if (preferences.display === 'cover') page.dataset.display = 'cover';
    else page.dataset.display = tab === 'lyrics' && preferences.display === 'lyrics' ? 'lyrics' : 'all';
  }

  function currentSongOffset() {
    return clamp(number(songOffsets[snapshot?.id]) ?? 0, -10000, 10000);
  }

  function currentOffset() {
    return currentSongOffset() + preferences.globalOffset;
  }

  function updateOffset(change) {
    if (!snapshot?.id || !snapshot.can.seek || host.trackId() !== snapshot.id) return;
    const value = change === 0 ? 0 : clamp(currentSongOffset() + change, -10000, 10000);
    if (value === 0) delete songOffsets[snapshot.id];
    else songOffsets[snapshot.id] = value;
    if (!saveObject(offsetsKey, songOffsets)) notify('偏移暂时无法保存');
    updateLyricTools();
    renderSourceDetails();
    const now = performance.now();
    syncLyrics(playbackTime(now), now, false);
    if (previewPosition) showPreview(previewPosition.x);
  }

  function updateLyricTools() {
    if (!view?.tools) return;
    const vocals = rawLyrics.flatMap(row => [row, ...(row.backingLines || [])]);
    const available = {
      karaoke: vocals.some(row => row.words.some(word => word.duration > 0)),
      translation: vocals.some(row => row.translation),
      roman: vocals.some(row => row.roman),
    };
    for (const key of ['karaoke', 'translation', 'roman']) {
      const button = view.tools.querySelector('[data-action="toggle-' + key + '"]');
      button.disabled = !available[key];
      button.setAttribute('aria-pressed', String(preferences[key]));
      if (key === 'roman') {
        const lineOnly = available.roman && !vocals.some(row => row.romanWords?.some(word => Number.isFinite(word.time) && word.duration > 0));
        button.classList.toggle('is-line-only', lineOnly);
        button.title = lineOnly ? '无逐字罗马音' : '显示罗马音';
      }
      view.prefFields.get(key).input.disabled = !available[key];
    }
    const romanKaraoke = view.prefFields.get('romanKaraoke');
    romanKaraoke.input.disabled = !preferences.roman || !available.roman;
    romanKaraoke.row.classList.toggle('is-disabled', romanKaraoke.input.disabled);
    const offset = currentSongOffset();
    text(view.offset, offset ? (offset > 0 ? '提前 ' : '延后 ') + (Math.abs(offset) / 1000).toFixed(1) + ' s' : '0.0 s');
    for (const button of view.settings.querySelectorAll('.apple-now-playing-offset button')) button.disabled = !snapshot?.can.seek;
  }

  function notify(message) {
    if (!activity) return;
    clearTimeout(toastTimer);
    text(view.toast, message);
    view.toast.hidden = false;
    toastTimer = setTimeout(() => { view.toast.hidden = true; }, 2200);
  }

  function endNativePlaylist(cancel = false, returnFocus = true) {
    const session = nativeDialog;
    if (!session) return;
    nativeDialog = undefined;
    session.observer.disconnect();
    clearTimeout(session.timeout);
    clearTimeout(session.finishTimer);
    session.bridge?.release(cancel);
    // Native Portal still owns any children until its own unmount completes.
    // Detach our container intact; never clear a native Portal's child nodes.
    session.layer.remove();
    page.setAttribute('aria-modal', 'true');
    if (returnFocus && !page.hidden && !closing && !document.hidden && session.focus?.isConnected) {
      session.focus.focus({ preventScroll: true });
    }
  }

  function settleNativePlaylist(session) {
    if (nativeDialog !== session) return;
    clearTimeout(session.finishTimer);
    const modal = session.dialogs.size > 0 || !!session.layer.querySelector('.cmd-modal-content');
    const toast = !!session.layer.querySelector('[data-testid="tid_toast_wrapper"]')?.textContent.trim();
    session.layer.dataset.modal = String(modal);
    page.setAttribute('aria-modal', modal ? 'false' : 'true');
    if (!session.pending && !modal && !toast && activity) {
      // A result toast may be created immediately after the modal closes.
      session.finishTimer = setTimeout(() => {
        if (nativeDialog === session) endNativePlaylist(false, true);
      }, 180);
    }
  }

  function observeNativePlaylist(session) {
    session.observer.disconnect();
    session.observer.observe(session.layer, { childList: true, subtree: true });
    if (session.pending) {
      clearTimeout(session.timeout);
      session.timeout = setTimeout(() => {
        if (nativeDialog !== session || !session.pending) return;
        endNativePlaylist(false, true);
        notify('网易云选单暂未打开，请稍后重试');
      }, 8000);
    }
    settleNativePlaylist(session);
  }

  function openNativePlaylist(id) {
    endNativePlaylist(true, false);
    const layer = document.createElement('div');
    layer.className = 'apple-now-playing-host-portal';
    layer.dataset.modal = 'false';
    const bodyStyle = getComputedStyle(document.body);
    for (const name of ['font-family', 'font-size', 'font-weight', 'font-style', 'line-height',
      'color', 'letter-spacing', 'text-align', 'text-transform', 'text-shadow']) {
      layer.style.setProperty(name, bodyStyle.getPropertyValue(name));
    }
    page.append(layer);
    const session = nativeDialog = {
      layer, dialogs: new Set(), pending: true,
      focus: page.querySelector('[data-action="menu"]'),
      observer: new MutationObserver(() => settleNativePlaylist(session)),
    };
    session.bridge = host.playlistOverlay(layer, {
      open(token) {
        if (nativeDialog !== session) return;
        session.pending = false;
        session.dialogs.add(token);
        clearTimeout(session.timeout);
        settleNativePlaylist(session);
      },
      close(token) {
        if (nativeDialog !== session) return;
        session.dialogs.delete(token);
        settleNativePlaylist(session);
      },
      toast() {
        if (nativeDialog === session) settleNativePlaylist(session);
      },
    });
    if (!session.bridge) {
      endNativePlaylist(false, true);
      notify('当前客户端暂不支持在播放页打开网易云选单');
      return;
    }
    observeNativePlaylist(session);
    if (!host.addToPlaylist(id)) {
      endNativePlaylist(true, true);
      notify('暂时无法打开网易云选单');
    }
  }

  function setSettingsVisible(open, immediately = false) {
    if (open === settingsOpen && !immediately) return;
    const panel = view.settings;
    const animate = !immediately && !reducedMotion.matches && !document.hidden && (open || !panel.hidden);
    const shown = { opacity: 1, transform: 'translateY(0px)' };
    const tucked = { opacity: 0, transform: 'translateY(-12px)' };
    let from = open ? tucked : shown;
    if (animate && settingsAnimation) {
      const style = getComputedStyle(panel);
      from = { opacity: style.opacity, transform: style.transform };
    }
    settingsAnimation?.cancel();
    settingsAnimation = undefined;
    settingsOpen = open;
    view.settingsToggle.setAttribute('aria-expanded', String(open));
    if (open) panel.removeAttribute('aria-hidden');
    else panel.setAttribute('aria-hidden', 'true');
    panel.hidden = !open && !animate;
    if (!animate) return;
    const animation = settingsAnimation = panel.animate([from, open ? shown : tucked], {
      duration: open ? 220 : 170, easing: open ? 'cubic-bezier(.22, 1, .36, 1)' : 'ease-in', fill: 'both',
    });
    animation.finished.then(() => {
      if (settingsAnimation !== animation) return;
      panel.hidden = !open;
      settingsAnimation = undefined;
      animation.cancel();
    }, () => {});
  }

  function openSettings() {
    closePopups();
    popupFocus = view.settingsToggle;
    setSettingsVisible(true);
    selectSettingsCategory('appearance');
    view.settingsCategories.get('appearance').tab.focus({ preventScroll: true });
    setControlsHidden(false);
  }

  function closePopups(returnFocus = false) {
    closeDropdown();
    if (settingsOpen) view.settingsCategories.get(view.settingsCategory).scrollTop = view.preferences.scrollTop;
    const hadPopup = settingsOpen || !view.menu.hidden || !view.rowMenu.hidden || !view.sourcePanel.hidden || !view.queueMenu.hidden;
    if ((returnFocus && hadPopup || settingsOpen && view.settings.contains(document.activeElement)) && popupFocus?.isConnected) {
      popupFocus.focus({ preventScroll: true });
    }
    setSettingsVisible(false);
    view.menu.hidden = view.rowMenu.hidden = view.sourcePanel.hidden = view.queueMenu.hidden = true;
    page.querySelector('[data-action="menu"]').setAttribute('aria-expanded', 'false');
    popupFocus = undefined;
  }

  function setControlsHidden(hidden) {
    hidden = !!hidden && narrowWindow.matches && tab !== 'none' && !settingsOpen &&
      view.menu.hidden && !drag && !view.volume.matches(':active') && !page.querySelector('.apple-now-playing-left :focus');
    if (controlsHidden === hidden) return;
    const anchor = tab === 'queue' && queueView.capture();
    controlsHidden = hidden;
    page.classList.toggle('controls-hidden', hidden);
    if (anchor) queueView.restore(anchor);
  }

  let lyricScrollHideTimer;
  function clearLyricScrollIndicator() {
    clearTimeout(lyricScrollHideTimer);
    view?.lyrics.classList.remove('apple-now-playing-user-scrolling');
  }

  function bindPanelBrowsing(scroller) {
    function input(delta) {
      if (!activity) return;
      if (scroller === view.lyrics && delta) {
        browseLyrics();
      }
      if (!narrowWindow.matches) return;
      if (delta > 8 && (scroller === view.lyrics || scroller.scrollTop < scroller.scrollHeight - scroller.clientHeight - 1)) setControlsHidden(true);
      if (delta < -4) setControlsHidden(false);
    }
    scroller.addEventListener('wheel', event => input(event.deltaY), { passive: true });
    let touchY;
    scroller.addEventListener('touchstart', event => { touchY = event.touches[0]?.clientY; }, { passive: true });
    scroller.addEventListener('touchmove', event => {
      const current = event.touches[0]?.clientY;
      if (current !== undefined && touchY !== undefined) input(touchY - current);
      touchY = current;
    }, { passive: true });
    scroller.addEventListener('keydown', event => {
      if (['ArrowDown', 'PageDown', 'End'].includes(event.key)) input(20);
      if (['ArrowUp', 'PageUp', 'Home'].includes(event.key)) input(-20);
    });
  }

  function copyViewText(row) {
    return [row.content, preferences.roman && row.roman, preferences.translation && row.translation].filter(Boolean).join('\n');
  }

  function updateCopyText() {
    view.copyText.value = rawLyrics.flatMap(row => [row, ...(row.backingLines || [])]).map(copyViewText).filter(Boolean).join('\n\n');
  }

  function toggleCopy(force) {
    const copyHadFocus = view.copy.contains(document.activeElement);
    const next = force === undefined ? !copyMode : force;
    if (next === copyMode) return;
    copyMode = next;
    if (copyMode) clearLyricScrollIndicator();
    view.copy.hidden = !copyMode || tab !== 'lyrics';
    view.lyrics.hidden = copyMode || tab !== 'lyrics';
    view.status.hidden = copyMode || tab !== 'lyrics' || lyrics.length > 0;
    if (copyMode) {
      copyAnchor = captureLyricAnchor();
      lyricView.suspend();
      updateCopyText();
      view.copyText.focus();
    } else {
      restoreLyricAnchor(copyAnchor);
      if (browseUntil <= performance.now()) positionLyrics(false);
      if (copyHadFocus && !page.hidden) view.lyrics.focus({ preventScroll: true });
    }
    updateLyricTools();
  }

  async function copyText(value) {
    if (!value) return;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
      else throw new Error('clipboard unavailable');
      notify('已复制');
    } catch (_) {
      if (!activity) return;
      const previousFocus = document.activeElement;
      const input = document.createElement('textarea');
      input.value = value;
      input.className = 'apple-now-playing-clipboard';
      page.append(input);
      input.select();
      let copied = false;
      try { copied = document.execCommand('copy'); } catch (_) {}
      input.remove();
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
      if (copied) notify('已复制');
      else {
        if (tab !== 'lyrics') showTab('lyrics');
        toggleCopy(true);
        view.copyText.value = value;
        view.copyText.select();
        notify('请选择文本后复制');
      }
    }
  }

  function popupAt(element, x, y) {
    element.hidden = false;
    const rect = element.getBoundingClientRect();
    element.style.left = clamp(x, 8, Math.max(8, innerWidth - rect.width - 8)) + 'px';
    element.style.top = clamp(y, 8, Math.max(8, innerHeight - rect.height - 8)) + 'px';
  }

  function menuButton(parent, action, label, data = {}, disabled = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.action = action;
    button.textContent = label;
    button.disabled = disabled;
    Object.assign(button.dataset, data);
    parent.append(button);
    return button;
  }

  function showRowMenu(index, x, y) {
    if (!rawLyrics.length) return;
    closePopups();
    rowMenuIndex = index;
    const row = lyrics[index];
    view.rowMenu.replaceChildren();
    if (row?.kind === 'line') {
      menuButton(view.rowMenu, 'copy-line', '复制这一行');
      menuButton(view.rowMenu, 'copy-original', '复制原文', {}, !row.content);
      menuButton(view.rowMenu, 'copy-translation', '复制译文', {}, !row.translation);
      menuButton(view.rowMenu, 'copy-roman', '复制罗马音', {}, !row.roman);
    }
    menuButton(view.rowMenu, 'copy-view', '复制歌词');
    popupFocus = document.activeElement;
    popupAt(view.rowMenu, x, y);
    view.rowMenu.querySelector('button').focus();
  }

  function hidePreview() {
    previewPosition = undefined;
    previewView?.dispose();
    previewView = previewRow = previewOptions = undefined;
    view.preview.hidden = true;
    view.seek.removeAttribute('aria-describedby');
  }

  function showPreview(x) {
    if (!activity || !preferences.preview || !snapshot?.duration || drag) return;
    const rect = view.seek.getBoundingClientRect();
    const seconds = clamp((x - rect.left) / rect.width, 0, 1) * snapshot.duration;
    const milliseconds = seconds * 1000 + currentOffset();
    previewPosition = { x, milliseconds };
    const candidate = lyrics[lyricIndexAt(milliseconds)];
    const row = candidate?.kind === 'line' ? candidate : undefined;
    const [time, container, status] = view.preview.children;
    text(time, formatTime(seconds));
    status.hidden = !!row;
    container.hidden = !row;
    view.seek.setAttribute('aria-describedby', view.preview.id);
    view.preview.hidden = false;
    view.preview.style.left = clamp(x, 155, Math.max(155, innerWidth - 155)) + 'px';
    view.preview.style.top = Math.max(60, rect.top - 8) + 'px';
    if (!row) {
      text(status, lyrics.length ? '间奏' : lyricSource);
      return;
    }
    if (!previewView) {
      previewView = new window.AppleNowPlayingExtView(container, () => {}, () => {});
      previewView.player.setEnableSpring(false);
      previewView.player.setAlignAnchor('top');
      previewView.player.setAlignPosition(0);
    }
    previewView.reduced = reducedMotion.matches;
    previewView.lift = preferences.lyricLift && !reducedMotion.matches;
    const options = [preferences.karaoke, preferences.roman, preferences.romanKaraoke, preferences.romanGrouping].join('/');
    if (previewRow !== row || previewOptions !== options) {
      previewRow = row;
      previewOptions = options;
      previewView.set([row], { ...preferences, translation: true }, snapshot.duration * 1000, milliseconds);
      for (const voice of previewView.player.currentLyricLineObjects) {
        const node = voice.getElement();
        node.tabIndex = -1;
        node.removeAttribute('role');
      }
    }
    previewView.tick(milliseconds, performance.now(), 0);
  }

  function setButtonLabel(button, label) {
    if (button.title === label && button.getAttribute('aria-label') === label) return;
    button.title = label;
    button.setAttribute('aria-label', label);
  }

  function syncFullScreen() {
    const button = page.querySelector('[data-action="screen"]');
    const active = document.fullscreenElement === page;
    button.disabled = !document.fullscreenEnabled || (!!document.fullscreenElement && !active);
    button.setAttribute('aria-pressed', String(active));
    setButtonLabel(button, active ? '退出全屏' : '进入全屏');
  }

  function replacementEnabled() {
    return takeover && plugin.enabled !== false && !lifetime.signal.aborted && (!page || page.isConnected);
  }

  function updateLauncher() {
    if (!launcher) return;
    if (replacementEnabled()) {
      if (!replacementOff?.active) replacementOff = host.replacePage(replacementEnabled, () => open());
    } else {
      replacementOff?.();
      replacementOff = undefined;
    }
    const hidden = !page?.hidden || (replacementEnabled() && host.coverEntry());
    if (launcher.hidden !== Boolean(hidden)) launcher.hidden = Boolean(hidden);
  }

  function handleVinyl(event) {
    if (!replacementEnabled() || event.defaultPrevented) return;
    const entry = event.target?.closest?.(vinylSelector);
    if (!entry) return;
    if (open(entry)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  function dispose() {
    if (lifetime.signal.aborted) return;
    lifetime.abort();
    manualLyricRefresh?.request?.abort();
    window.AppleNowPlayingQQLyrics?.setNativeFetch?.(null);
    entryObserver?.disconnect();
    endNativePlaylist(true, false);
    replacementOff?.();
    replacementOff = undefined;
    if (activity) stopActivity();
    cancelPageTransition();
    previewView?.dispose();
    lyricView?.dispose();
    page?.remove();
    launcher?.remove();
    pageStyle?.remove();
    window.removeEventListener('keydown', handleKeyboard, true);
    document.removeEventListener('fullscreenchange', syncFullScreen);
  }

  function open(entry = document.activeElement) {
    try {
      if (!page) mount();
      if (!page.hidden) {
        if (!closing) return true;
        closing = false;
        panelSlide?.animation.play();
        panelFade?.animation.play();
        dirty = true;
        playPageTransition(false);
        return true;
      }
      focusBeforeOpen = entry;
      page.hidden = false;
      updateLauncher();
      showTab(preferences.display === 'cover' ? 'none' : 'lyrics');
      page.classList.add('is-opening');
      page.focus({ preventScroll: true });
      startActivity();
      fitCoverToControls();
      playPageTransition(false);
      return true;
    } catch (error) {
      if (page && !page.hidden) close(true);
      console.warn('[AppleNowPlaying] 无法打开播放页', error);
      return false;
    }
  }

  function fitCoverToControls() {
    if (!activity) return;
    const left = page.querySelector('.apple-now-playing-left');
    const style = getComputedStyle(left);
    const controls = page.querySelector('.apple-now-playing-controls').getBoundingClientRect().height;
    const reserved = Math.ceil(controls + (parseFloat(style.rowGap) || 0) +
      (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0) + 2);
    const value = reserved + 'px';
    if (page.style.getPropertyValue('--apple-now-playing-controls-space') !== value) page.style.setProperty('--apple-now-playing-controls-space', value);
  }

  function startActivity() {
    if (activity || document.hidden) return;
    const scope = activity = new AbortController();
    if (host.canFetchPublicQQLyrics()) window.AppleNowPlayingQQLyrics?.setNativeFetch?.((url, signal) => host.fetchPublicQQLyrics(url, signal));
    if (nativeDialog) observeNativePlaylist(nativeDialog);
    const markDirty = () => { dirty = true; };
    unwatchHost = host.watch(markDirty, (event, receipt) => {
      if (!snapshot || snapshot.playId !== String(event.playId) || snapshot.restored || pendingSeek || deferredSeek) {
        markDirty();
        return;
      }
      snapshot.position = clamp(Number(event.current), 0, snapshot.duration);
      snapshot.confirmedPosition = true;
      snapshot.audioReceipt = receipt;
      updateClock(performance.now(), false, true);
    });
    lyricResize = new ResizeObserver(() => {
      if (closing) return;
      fitCoverToControls();
      queueView.render();
    });
    lyricResize.observe(view.lyrics);
    lyricResize.observe(view.queueScroll);
    lyricResize.observe(page.querySelector('.apple-now-playing-controls'));
    const lyricsFontChanged = () => {
      previewView?.player.onResize();
      lyricView.player.onResize();
      if (previewPosition) showPreview(previewPosition.x);
    };
    for (const name of ['loadingdone', 'loadingerror']) document.fonts?.addEventListener(name, lyricsFontChanged);
    scope.signal.addEventListener('abort', () => {
      for (const name of ['loadingdone', 'loadingerror']) document.fonts?.removeEventListener(name, lyricsFontChanged);
    }, { once: true });
    fitCoverToControls();
    queueView.connect(scope.signal);
    window.addEventListener('resize', () => {
      fluidRenderer.invalidate();
      settlePageTransition();
      cancelPanelSlide();
      cancelPanelFade();
      setControlsHidden(false);
    }, { signal: scope.signal });
    window.addEventListener('pointerup', event => {
      if (volumeGesture?.pointer === event.pointerId) finishVolumeGesture();
      if (drag?.pointer !== event.pointerId) return;
      // Chromium dispatches the range's change event on release. Commit here
      // only when no change event completed the gesture.
      dragEndTimer = setTimeout(finishDrag, 0);
    }, { signal: scope.signal });
    window.addEventListener('pointercancel', event => {
      if (volumeGesture?.pointer === event.pointerId) finishVolumeGesture();
      if (drag?.pointer !== event.pointerId) return;
      drag.cancelled = true;
      dragEndTimer = setTimeout(finishDrag, 0);
    }, { signal: scope.signal });
    snapshot = undefined;
    clock = undefined;
    sampleAt = 0;
    dirty = true;
    page.classList.add('is-active');
    tick(performance.now());
  }

  function stopActivity() {
    clearLyricScrollIndicator();
    setSettingsVisible(false, true);
    cancelPanelSlide();
    cancelPanelFade();
    closeDropdown();
    nativeDialog?.observer.disconnect();
    clearTimeout(nativeDialog?.timeout);
    clearTimeout(nativeDialog?.finishTimer);
    flushVolume();
    clearTimeout(volumeTimer);
    volumeTimer = volumeQueued = volumeGesture = undefined;
    view.volumeGroup.classList.remove('is-adjusting');
    activity?.abort();
    activity = undefined;
    unwatchHost?.();
    unwatchHost = undefined;
    lyricResize?.disconnect();
    lyricResize = undefined;
    cancelAnimationFrame(frame);
    stopAudioAnalysis();
    fluidRenderer.stop();
    queueDrag = undefined;
    lyricView.releaseRows();
    browseUntil = 0;
    page.dataset.lyricBrowsing = 'false';
    queueView.disconnect();
    detailRequest?.abort();
    detailRequest = undefined;
    detailTrackId = details?.id;
    clearTimeout(toastTimer);
    view.toast.hidden = true;
    hidePreview();
    clearTimeout(dragEndTimer);
    drag = pendingSeek = deferredSeek = seekAlignment = pendingVolume = undefined;
    if (lyricRequest) {
      restartLyrics = true;
      lyricRequest.abort();
      lyricRequest = undefined;
    }
    coverKey = undefined;
    cancelPalette();
    view.cover.removeAttribute('src');
    view.cover.hidden = true;
    clearSharedArt();
    page.style.removeProperty('--apple-now-playing-cover-image');
    for (const layer of view.backdrop) layer.style.removeProperty('--apple-now-playing-image');
    coverSaveRequest?.abort();
    coverSaveRequest = undefined;
    view.lyrics.scrollTo({ top: view.lyrics.scrollTop, behavior: 'instant' });
    page.classList.remove('is-active');
    for (const layer of view.backdrop) layer.classList.remove('apple-now-playing-fading');
    // Hidden CEF windows can defer CSS updates. Cancel their animation objects
    // immediately instead of waiting for the next visible style calculation.
    for (const animation of page.getAnimations({ subtree: true })) {
      if (!animation.effect?.target?.closest?.('.apple-now-playing-host-portal')) animation.cancel();
    }
    fontRequest++;
    refreshSettingsSource();
  }

  function coverFrame(element, rounded = element, edgeOpacity = 0) {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(rounded);
    const [x, y = x] = style.borderTopLeftRadius.split(' ');
    const percent = (value, size) => value.endsWith('%') ? value : 100 * (parseFloat(value) || 0) / Math.max(1, size) + '%';
    return {
      rect, edgeOpacity, shadow: style.boxShadow,
      radius: percent(x, rounded.offsetWidth) + ' / ' + percent(y, rounded.offsetHeight),
    };
  }

  function sharedCoverEndpoints() {
    if (!snapshot?.cover || snapshot.id !== host.trackId() || page.dataset.display === 'lyrics' ||
        document.fullscreenElement || !view.coverBox.getClientRects().length) return;
    const entry = host.coverEntry();
    const thumbnail = entry?.querySelector('img');
    if (!thumbnail || !(thumbnail.currentSrc || thumbnail.src) || getComputedStyle(thumbnail).visibility !== 'visible') return;
    const small = thumbnail.getBoundingClientRect();
    if (!small.width || !small.height || small.bottom <= 0 || small.right <= 0 || small.top >= innerHeight || small.left >= innerWidth) return;
    const large = coverFrame(view.coverBox, view.coverBox, 1);
    if (!large.rect.width || !large.rect.height) return;
    // Some host builds round the art via its equally sized clipping wrapper.
    const rounded = [thumbnail, thumbnail.parentElement, entry].find(candidate => {
      const rect = candidate.getBoundingClientRect();
      return Math.abs(rect.width - small.width) < 2 && Math.abs(rect.height - small.height) < 2 &&
        parseFloat(getComputedStyle(candidate).borderTopLeftRadius) > 0;
    }) || thumbnail;
    return { thumbnail, small: coverFrame(thumbnail, rounded), large };
  }

  function cancelCoverFlight() {
    const flight = pageTransition?.flight;
    if (!flight) return;
    pageTransition.flight = undefined;
    flight.thumbnail.classList.remove('apple-now-playing-shared-thumbnail');
    flight.node.remove();
    for (const animation of flight.animations) animation.cancel();
    page.classList.remove('cover-moving');
  }

  function cancelPageTransition() {
    const transition = pageTransition;
    if (transition) {
      cancelCoverFlight();
      pageTransition = undefined;
      for (const animation of transition.animations) animation.cancel();
    }
    page?.classList.remove('is-opening', 'is-closing');
  }

  function settlePageTransition() {
    if (closing) finishClose();
    else cancelPageTransition();
  }

  function playCoverFlight(transition, animate, endpoints, from, to, duration, lead = 0) {
    const { thumbnail } = endpoints;
    const node = document.createElement('div');
    const image = new Image();
    const edge = document.createElement('span');
    node.className = 'apple-now-playing-cover-flight';
    node.setAttribute('aria-hidden', 'true');
    edge.className = 'apple-now-playing-cover-flight-edge';
    image.alt = '';
    image.src = thumbnail.currentSrc || thumbnail.src;
    node.append(image, edge);
    Object.assign(node.style, {
      left: to.rect.left + 'px', top: to.rect.top + 'px', width: to.rect.width + 'px', height: to.rect.height + 'px',
    });
    page.append(node);
    page.classList.add('cover-moving');
    thumbnail.classList.add('apple-now-playing-shared-thumbnail');
    const transform = dy => 'translate3d(' + (from.rect.left - to.rect.left) + 'px,' + (from.rect.top - to.rect.top + dy) +
      'px,0) scale(' + from.rect.width / to.rect.width + ',' + from.rect.height / to.rect.height + ')';
    const first = { transform: transform(0), borderRadius: from.radius, boxShadow: from.shadow };
    const frames = [first];
    if (closing) {
      const settings = pageTransitionSettings.close;
      first.easing = settings.slideEase;
      frames.push({ ...first, transform: transform(lead), offset: settings.detach / duration, easing: pageTransitionSettings.easing });
    }
    frames.push({ transform: 'none', borderRadius: to.radius, boxShadow: to.shadow });
    const animation = animate(node, frames, { duration, easing: closing ? 'linear' : pageTransitionSettings.easing });
    const edgeAnimation = animate(edge, [{ opacity: from.edgeOpacity }, { opacity: to.edgeOpacity }], { duration });
    const flight = transition.flight = { node, edge, thumbnail, animations: [animation, edgeAnimation] };
    animation.finished.then(() => {
      if (pageTransition !== transition || transition.flight !== flight) return;
      if (!closing && view.cover.hidden && image.naturalWidth && snapshot?.id === host.trackId()) {
        // Keep the landed art in place if the full-size image is still loading.
        view.coverBox.classList.add('shared-art');
        view.coverBox.style.backgroundImage = 'url(' + JSON.stringify(image.src) + ')';
      }
      // During dismissal the master hands both real covers back together.
      if (!closing) cancelCoverFlight();
    }, () => {});
  }

  function playPageTransition(outgoing) {
    if (document.hidden) {
      cancelPageTransition();
      return;
    }
    const interrupted = pageTransition;
    const previousLayers = new Map();
    for (const element of interrupted?.layers || []) {
      const { opacity, transform } = getComputedStyle(element);
      previousLayers.set(element, { opacity: Number(opacity), transform });
    }
    const flight = interrupted?.flight;
    const previousCover = flight && coverFrame(flight.node, flight.node, Number(getComputedStyle(flight.edge).opacity));
    cancelPageTransition();
    page.classList.toggle('is-opening', !outgoing);
    page.classList.toggle('is-closing', outgoing);
    const fadeOnly = reducedMotion.matches || !!document.fullscreenElement;
    const endpoints = !fadeOnly && sharedCoverEndpoints();
    const simple = fadeOnly || interrupted?.simple || (!outgoing && !endpoints && !interrupted?.slide);
    const transition = pageTransition = { animations: [], layers: new Set(), simple, slide: outgoing && !simple };
    const start = document.timeline.currentTime;
    function animate(element, frames, timing) {
      const animation = element.animate(frames, { fill: 'both', easing: pageTransitionSettings.easing, ...timing });
      if (start !== null) animation.startTime = start;
      transition.animations.push(animation);
      return animation;
    }
    function reveal(element, timing, move) {
      if (!element.getClientRects().length) return;
      const [delay, end, distance] = timing;
      const captured = previousLayers.get(element);
      const from = { opacity: captured?.opacity ?? (interrupted?.slide ? 1 : 0) };
      const to = { opacity: 1 };
      if (move || captured) {
        const rest = getComputedStyle(element).transform;
        from.transform = captured?.transform || (interrupted?.slide || !move ? rest : move(distance));
        to.transform = rest;
      }
      transition.layers.add(element);
      animate(element, [from, to], { delay: captured ? 0 : delay, duration: end - (captured ? 0 : delay) });
    }
    let master;
    if (simple) {
      const opacity = previousLayers.get(page)?.opacity ?? previousLayers.get(view.pageBackground)?.opacity ?? (outgoing ? 1 : 0);
      transition.layers.add(page);
      master = animate(page, [{ opacity }, { opacity: outgoing ? 0 : 1 }], {
        duration: reducedMotion.matches ? pageTransitionSettings.reduced : pageTransitionSettings.fade,
      });
    } else if (outgoing) {
      const settings = pageTransitionSettings.close;
      const lead = Math.round(page.clientHeight * settings.lead);
      const travel = Math.round(page.clientHeight * settings.travel);
      // Move the visual groups in viewport coordinates. The root still blocks
      // clicks and the independent artwork can land on the stationary minibar.
      const groups = [view.pageBackground, view.left, view.right, view.grip,
        ...view.pageControls.filter(element => !view.left.contains(element))];
      for (const element of groups) {
        if (!element.getClientRects().length) continue;
        const captured = previousLayers.get(element);
        const style = getComputedStyle(element);
        const opacity = captured?.opacity ?? Number(style.opacity);
        const base = captured?.transform || style.transform;
        const shifted = dy => 'translateY(' + dy + 'px)' + (base === 'none' ? '' : ' ' + base);
        transition.layers.add(element);
        animate(element, [
          { transform: shifted(0), opacity, easing: settings.slideEase },
          { transform: shifted(lead), opacity, offset: settings.detach / settings.duration, easing: settings.slideEase },
          { transform: shifted(travel), opacity: 0 },
        ], { duration: settings.duration, easing: 'linear' });
      }
      // If a close interrupts the staggered reveal, retain each child's
      // visible state while its parent slides away.
      for (const [element, frame] of previousLayers) {
        if (element !== page && !transition.layers.has(element)) {
          transition.layers.add(element);
          animate(element, [frame, frame], { duration: settings.duration });
        }
      }
      if (endpoints) {
        const from = previousCover && flight.thumbnail === endpoints.thumbnail ? previousCover : endpoints.large;
        playCoverFlight(transition, animate, endpoints, from, endpoints.small, settings.duration, lead);
      }
      master = animate(page, [], { duration: settings.duration });
    } else {
      const settings = pageTransitionSettings.open;
      const translate = pixels => 'translateY(' + pixels + 'px)';
      if (previousLayers.has(view.left)) reveal(view.left, [0, settings.duration]);
      reveal(view.pageBackground, settings.background, scale => 'scale(' + scale + ')');
      reveal(view.meta, settings.meta, translate);
      for (const element of view.pageControls) reveal(element, settings.controls, translate);
      reveal(view.grip, settings.controls);
      if (tab !== 'none') reveal(view.right, settings.panel, translate);
      if (endpoints) {
        const from = previousCover && flight.thumbnail === endpoints.thumbnail ? previousCover : endpoints.small;
        playCoverFlight(transition, animate, endpoints, from, endpoints.large, settings.cover);
      }
      master = animate(page, [], { duration: settings.duration });
    }
    master.finished.then(() => {
      if (pageTransition !== transition) return;
      if (outgoing) finishClose();
      else cancelPageTransition();
    }, () => {});
  }

  function finishClose() {
    cancelPageTransition();
    closing = false;
    if (activity) stopActivity();
    const exiting = document.fullscreenElement === page ? document.exitFullscreen().catch(() => {}) : undefined;
    page.hidden = true;
    updateLauncher();
    const entry = focusBeforeOpen instanceof HTMLElement && focusBeforeOpen.isConnected && focusBeforeOpen.getClientRects().length
      ? focusBeforeOpen : host.coverEntry() || launcher;
    if (entry && !entry.matches('button, input, a[href], [tabindex]')) {
      entry.tabIndex = -1;
      entry.addEventListener('blur', () => entry.removeAttribute('tabindex'), { once: true });
    }
    focusBeforeOpen = undefined;
    const restore = () => { if (page.hidden && !document.hidden && !lifetime.signal.aborted) entry?.focus({ preventScroll: true }); };
    if (exiting) exiting.then(restore);
    else restore();
  }

  function close(immediate = false) {
    if (page.hidden) return;
    endNativePlaylist(true, false);
    if (closing) {
      if (immediate) finishClose();
      return;
    }
    if (tab === 'lyrics') panelPositions.lyrics = { id: snapshot?.id, anchor: captureLyricAnchor() };
    if (tab === 'queue') panelPositions.queue = { id: snapshot?.id, anchor: queueView.capture() };
    closePopups();
    hidePreview();
    closing = true;
    if (immediate || document.hidden) {
      finishClose();
      return;
    }
    panelSlide?.animation.pause();
    panelFade?.animation.pause();
    lyricView.suspend();
    queueView.stopScroll();
    sampleAt = 0;
    playPageTransition(true);
  }

  function handleKeyboard(event) {
    if (nativeDialog?.pending || nativeDialog?.dialogs.size || event.target?.closest?.('.apple-now-playing-host-portal')) return;
    const editing = event.target?.closest?.('textarea:not([readonly]), [contenteditable]:not([contenteditable="false"]), input:not([type="range"]):not([type="checkbox"]):not([type="radio"])');
    const keyM = event.code === 'KeyM' || /^m$/i.test(event.key) || event.keyCode === 77;
    if (event.ctrlKey && event.shiftKey && keyM && !event.repeat && !editing) {
      if (page.hidden || closing) {
        if (!open()) return;
      } else {
        close();
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (closing) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (page.hidden || editing || !page.contains(event.target)) return;
    if (dropdown && handleDropdownKeyboard(event)) return;
    if (event.key === 'Escape' && !event.repeat) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (document.fullscreenElement === page) document.exitFullscreen().catch(() => {});
      else if (settingsOpen || !view.menu.hidden || !view.rowMenu.hidden || !view.sourcePanel.hidden || !view.queueMenu.hidden) closePopups(true);
      else if (copyMode) toggleCopy(false);
      else close();
    } else if (event.key === 'Tab') {
      const focusRoot = !view.sourcePanel.hidden ? view.sourcePanel : settingsOpen ? view.settings : page;
      const focusable = [...focusRoot.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')]
        .filter(element => element.tabIndex >= 0 && element.getClientRects().length &&
          (settingsOpen || !view.settings.contains(element)) &&
          !(panelFade?.outgoing && view.right.contains(element)));
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (document.activeElement === page) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
      event.stopPropagation();
    } else if ([' ', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
      // Keep the browser's default activation and range handling inside the page.
      // Lyric navigation handles its keys at the lyric container instead.
      if (!event.target.closest('.apple-now-playing-lyrics, .apple-now-playing-segmented, .apple-now-playing-dropdown-trigger, .apple-now-playing-settings-nav')) event.stopPropagation();
    }
  }

  function cancelPanelSlide() {
    const slide = panelSlide;
    if (!slide) return;
    panelSlide = undefined;
    slide.animation.cancel();
    view.left.classList.remove('is-sliding');
  }

  function springVelocity(motion) {
    if (!motion?.animation) return 0;
    const { animation, positions, duration } = motion;
    const time = Number(animation.currentTime);
    if (time <= 0 || time >= duration) return 0;
    const intervals = positions.length - 1;
    const index = Math.floor(time * intervals / duration);
    return (positions[index + 1] - positions[index]) * intervals / duration;
  }

  function springPositions(distance, velocity, duration, dampingRatio) {
    // Normalize the spring to a settling time of one animation duration.
    // The previous compositor segment supplies the initial velocity on reversal.
    const damping = clamp(dampingRatio, .1, .99);
    const decay = 7.8;
    const frequency = decay * Math.sqrt(1 - damping * damping) / damping;
    const sineWeight = (velocity * duration + decay * distance) / frequency;
    const steps = Math.max(2, Math.ceil(duration / 8));
    return Array.from({ length: steps + 1 }, (_, index) => {
      if (index === steps) return 0;
      const t = index / steps;
      return Math.exp(-decay * t) * (distance * Math.cos(frequency * t) + sineWeight * Math.sin(frequency * t));
    });
  }

  function animatePanelSlide(from, velocity) {
    const distance = from - view.left.getBoundingClientRect().left;
    if (Math.abs(distance) < .25 && Math.abs(velocity) < .01) return false;
    const { duration, dampingRatio } = panelSpringSettings;
    const positions = springPositions(distance, velocity, duration, dampingRatio);
    view.left.classList.add('is-sliding');
    const animation = view.left.animate(positions.map(x => ({ transform: 'translate3d(' + x + 'px, 0, 0)' })), {
      duration, fill: 'backwards',
    });
    const slide = panelSlide = { animation, positions, duration };
    animation.finished.then(() => {
      if (panelSlide === slide) cancelPanelSlide();
    }, () => {});
    return true;
  }

  function cancelPanelFade() {
    const fade = panelFade;
    if (!fade) return;
    panelFade = undefined;
    if (fade.outgoing) {
      view.right.classList.remove('is-fading-out');
      view.right.removeAttribute('aria-hidden');
      for (const property of ['left', 'top', 'width', 'height']) view.right.style.removeProperty(property);
      view.lyrics.hidden = view.copy.hidden = view.status.hidden = true;
    }
    fade.animation.cancel();
  }

  function animatePanel(keyframes, options, outgoing) {
    if (outgoing) {
      const origin = page.getBoundingClientRect();
      Object.assign(view.right.style, {
        left: (outgoing.left - origin.left) + 'px', top: (outgoing.top - origin.top) + 'px',
        width: outgoing.width + 'px', height: outgoing.height + 'px',
      });
      view.right.classList.add('is-fading-out');
      view.right.setAttribute('aria-hidden', 'true');
    }
    const animation = view.panel.animate(keyframes, options);
    const fade = panelFade = { animation, outgoing: !!outgoing };
    animation.finished.then(() => {
      if (panelFade === fade) cancelPanelFade();
    }, () => {});
  }

  function showTab(next) {
    const previous = tab;
    if (!closing && (previous !== next || preferences.display !== 'all')) cancelPageTransition();
    const changedPosition = (previous === 'none') !== (next === 'none');
    const fullLayout = preferences.display === 'all' && page.dataset.display === 'all';
    const animateTab = activity && previous !== next && !closing && !reducedMotion.matches;
    const animatePosition = animateTab && changedPosition && fullLayout && !narrowWindow.matches;
    const fadeOut = animateTab && previous === 'lyrics' && next === 'none';
    const reopening = animateTab && panelFade?.outgoing && next === 'lyrics';
    const opacity = fadeOut || reopening ? Number(getComputedStyle(view.panel).opacity) : 0;
    const bounds = fadeOut && opacity > .01 ? view.right.getBoundingClientRect() : undefined;
    const outgoing = bounds?.width && bounds.height ? bounds : undefined;
    const outgoingCopy = copyMode;
    const returnLyricFocus = outgoing && view.right.contains(document.activeElement);
    const from = animatePosition ? view.left.getBoundingClientRect().left : 0;
    const velocity = animatePosition ? springVelocity(panelSlide) : 0;
    if (changedPosition || !fullLayout) cancelPanelSlide();
    if (previous !== next || panelFade?.outgoing) cancelPanelFade();
    if (snapshot && previous === 'lyrics') panelPositions.lyrics = { id: snapshot.id, anchor: captureLyricAnchor() };
    if (snapshot && previous === 'queue') panelPositions.queue = { id: snapshot.id, anchor: queueView.capture() };
    if (copyMode && next !== 'lyrics') toggleCopy(false);
    if (previous !== next) clearLyricScrollIndicator();
    if (previous === 'lyrics' && next !== 'lyrics') lyricView.suspend();
    tab = next;
    page.dataset.panel = next;
    updateDisplayMode();
    const showLyrics = next === 'lyrics' || !!outgoing;
    const showCopy = outgoing ? outgoingCopy : copyMode;
    view.lyrics.hidden = !showLyrics || showCopy;
    view.copy.hidden = !showLyrics || !showCopy;
    view.queue.hidden = next !== 'queue';
    view.status.hidden = !showLyrics || showCopy || lyrics.length > 0;
    view.lyricsToggle.setAttribute('aria-pressed', String(next === 'lyrics'));
    page.querySelector('[data-action="queue"]').setAttribute('aria-pressed', String(next === 'queue'));
    setControlsHidden(false);
    const sliding = animatePosition && animatePanelSlide(from, velocity);
    if (next === 'queue') {
      renderQueue();
      if (panelPositions.queue?.id === snapshot?.id) queueView.restore(panelPositions.queue.anchor);
      queueView.render();
    } else if (next === 'lyrics') {
      const now = performance.now();
      syncLyrics(playbackTime(now), now, false);
      if (browseUntil > now && panelPositions.lyrics?.id === snapshot?.id) restoreLyricAnchor(panelPositions.lyrics.anchor);
      else positionLyrics(false);
    }
    const { outDuration, inDuration, slideInDelay } = lyricPanelFadeSettings;
    if (outgoing) {
      if (returnLyricFocus) view.lyricsToggle.focus({ preventScroll: true });
      animatePanel([{ opacity }, { opacity: 0 }], { duration: outDuration, fill: 'both', easing: 'ease-out' }, outgoing);
    } else if (animateTab && next !== 'none') {
      if (next === 'lyrics' || sliding) {
        const startOpacity = reopening ? opacity : sliding ? 0 : .3;
        animatePanel([{ opacity: startOpacity }, { opacity: 1 }], {
          delay: sliding && !reopening ? slideInDelay : 0, duration: inDuration, fill: 'backwards', easing: 'ease-out',
        });
      } else {
        animatePanel([{ opacity: .3, transform: 'translateY(7px)' }, { opacity: 1, transform: 'none' }], {
          duration: 160, easing: 'ease-out',
        });
      }
    }
  }

  function handleClick(event) {
    if (closing) return;
    if (event.target.closest('.apple-now-playing-host-portal')) return;
    const target = event.target.closest('button');
    if (!target) {
      if (!event.target.closest('.apple-now-playing-settings-panel, .apple-now-playing-menu, .apple-now-playing-row-menu, .apple-now-playing-source-panel, .apple-now-playing-queue-menu')) closePopups();
      return;
    }
    if (!page.contains(target)) return;
    const trackMenuAction = view.menu.contains(target);
    const action = target.dataset.action;
    const id = snapshot?.id;
    if (target.dataset.trackId && target.dataset.trackId !== host.trackId()) {
      closePopups();
      notify('曲目已切换');
      return;
    }
    if (trackMenuAction) closePopups(true);
    else if (action !== 'menu' && !view.menu.hidden) closePopups();
    switch (action) {
      case 'close': close(); break;
      case 'screen':
        if (document.fullscreenElement === page) document.exitFullscreen().catch(() => {});
        else page.requestFullscreen?.().catch(() => {});
        break;
      case 'play':
      case 'previous':
      case 'next':
      case 'favorite':
      case 'mode':
        host.click(action);
        dirty = true;
        break;
      case 'menu':
        if (!view.menu.hidden) closePopups(true);
        else showTrackMenu();
        break;
      case 'settings':
        if (settingsOpen) closePopups(true);
        else openSettings();
        break;
      case 'close-settings': closePopups(true); break;
      case 'source': showSourceDetails(); break;
      case 'refresh-lyrics': refreshCurrentLyrics(); break;
      case 'close-source': closePopups(true); break;
      case 'load-fonts': loadFonts(); break;
      case 'add-font': addSelectedFont(); break;
      case 'queue-menu': {
        const rect = target.getBoundingClientRect();
        showQueueMenu(target.dataset.resourceId, target.dataset.resourceType, rect.right - 200, rect.bottom);
        break;
      }
      case 'queue-next':
      case 'queue-remove':
      case 'queue-up':
      case 'queue-down':
        if (queueMenuTarget && !host.mutateQueue(action.slice(6), queueMenuTarget.id, queueMenuTarget.type)) {
          notify('当前操作不可用，请在网易云管理');
        }
        closePopups(true);
        dirty = true;
        break;
      case 'cover':
      case 'host-queue':
        if (host.click(action === 'cover' ? 'cover' : 'queue')) close(true);
        break;
      case 'queue':
      case 'lyrics':
        showTab(tab === action ? 'none' : action);
        break;
      case 'toggle-karaoke':
      case 'toggle-translation':
      case 'toggle-roman': {
        const key = action.slice(7);
        setPreference(key, !preferences[key]);
        break;
      }
      case 'offset-ahead': updateOffset(100); break;
      case 'offset-behind': updateOffset(-100); break;
      case 'offset-reset': updateOffset(0); break;
      case 'copy-view':
        closePopups();
        toggleCopy();
        break;
      case 'copy-all': copyText(view.copyText.value); break;
      case 'select-all': view.copyText.focus(); view.copyText.select(); break;
      case 'copy-line':
      case 'copy-original':
      case 'copy-translation':
      case 'copy-roman': {
        const row = lyrics[rowMenuIndex];
        if (!row) break;
        const vocals = [row, ...(row.backingLines || [])];
        const value = action === 'copy-line' ? vocals.map(copyViewText).join('\n') :
          vocals.map(vocal => vocal[{ 'copy-original': 'content', 'copy-translation': 'translation', 'copy-roman': 'roman' }[action]]).filter(Boolean).join('\n');
        closePopups(true);
        copyText(value);
        break;
      }
      case 'detail-song':
        if (host.navigate(id, 'song')) close(true);
        break;
      case 'detail-artist':
      case 'detail-album':
        if (host.navigate(id, action === 'detail-artist' ? 'artist' : 'album', { id: target.dataset.id })) close(true);
        break;
      case 'add-playlist':
        openNativePlaylist(id);
        break;
      case 'copy-track': copyText(snapshot.name); break;
      case 'copy-alias': copyText(view.alias.textContent); break;
      case 'copy-cover': copyText(snapshot.cover); break;
      case 'save-cover': saveCurrentCover(); break;
      case 'queue-play':
        if (!host.playQueue(target.dataset.resourceId, target.dataset.resourceType)) notify('队列已变化，请在网易云管理');
        dirty = true;
        break;
    }
  }

  async function saveCurrentCover() {
    if (!activity || !snapshot?.cover || !window.AppleNowPlayingCoverSave) return;
    if (coverSaveRequest) { notify('正在保存封面，请稍候'); return; }
    const scope = activity;
    const request = coverSaveRequest = new AbortController();
    const cancel = () => request.abort();
    scope.signal.addEventListener('abort', cancel, { once: true });
    const track = { url: snapshot.cover, name: snapshot.name, id: snapshot.id };
    notify('正在保存封面…');
    try {
      const path = await window.AppleNowPlayingCoverSave.save(track, request.signal);
      if (!request.signal.aborted && activity === scope) notify('封面已保存：' + path);
    } catch (error) {
      if (!request.signal.aborted && activity === scope) notify(error.message || '保存封面失败，请重试');
    } finally {
      scope.signal.removeEventListener('abort', cancel);
      if (coverSaveRequest === request) coverSaveRequest = undefined;
    }
  }

  function finishDrag() {
    clearTimeout(dragEndTimer);
    const gesture = drag;
    drag = undefined;
    if (gesture?.changed && !gesture.cancelled && gesture.id === snapshot?.id) seek(gesture.target);
  }

  function cancelPalette() {
    if (!paletteImage) return;
    paletteImage.onload = paletteImage.onerror = null;
    paletteImage.removeAttribute('src');
    paletteImage = undefined;
  }

  function applyBackdropTheme(colors) {
    const samples = (colors || ['rgb(72,72,72)', 'rgb(88,88,88)', 'rgb(56,56,56)'])
      .map(color => color.match(/\d+/g).slice(0, 3).map(Number));
    const tint = samples[0].map((_, channel) => samples.reduce((sum, rgb) => sum + rgb[channel], 0) / samples.length);
    const mix = (rgb, target, amount) => rgb.map(value => Math.round(value * (1 - amount) + target * amount));
    const color = (rgb, alpha) => alpha === undefined ? 'rgb(' + rgb.join(',') + ')' : 'rgba(' + rgb.join(',') + ',' + alpha + ')';
    // Keep the strongest cover hue rather than washing every secondary color
    // almost to white. Neutral artwork still receives a neutral reading theme.
    const chroma = rgb => Math.max(...rgb) - Math.min(...rgb);
    const swatch = samples.reduce((best, rgb) => chroma(rgb) > chroma(best) ? rgb : best, samples[0]);
    const normalized = swatch.map(value => value / 255);
    const maximum = Math.max(...normalized), minimum = Math.min(...normalized);
    const delta = maximum - minimum, luminosity = (maximum + minimum) / 2;
    const saturation = delta ? delta / (1 - Math.abs(2 * luminosity - 1)) : 0;
    function accentColor() {
      if (delta * 255 < 14 || saturation < .12) return [222, 222, 222];
      let hue = maximum === normalized[0] ? (normalized[1] - normalized[2]) / delta :
        maximum === normalized[1] ? (normalized[2] - normalized[0]) / delta + 2 :
          (normalized[0] - normalized[1]) / delta + 4;
      hue = (hue + 6) % 6;
      const s = clamp(saturation * .9, .48, .78), l = .76;
      const c = (1 - Math.abs(2 * l - 1)) * s;
      const x = c * (1 - Math.abs(hue % 2 - 1)), m = l - c / 2;
      const rgb = hue < 1 ? [c, x, 0] : hue < 2 ? [x, c, 0] : hue < 3 ? [0, c, x] :
        hue < 4 ? [0, x, c] : hue < 5 ? [x, 0, c] : [c, 0, x];
      return rgb.map(value => Math.round((value + m) * 255));
    }
    const fg = mix(tint, 255, .96);
    const base = mix(tint, 0, .28);
    let ink = accentColor();
    const luminance = rgb => rgb.map(value => value / 255).reduce((sum, value, index) =>
      sum + (value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4) * [.2126, .7152, .0722][index], 0);
    const backgroundLuminance = luminance(base);
    for (let attempt = 0; attempt < 16; attempt++) {
      const textLuminance = luminance(ink.map((value, index) => value * .86 + base[index] * .14));
      const contrast = (Math.max(textLuminance, backgroundLuminance) + .05) /
        (Math.min(textLuminance, backgroundLuminance) + .05);
      if (contrast >= 4.5) break;
      ink = mix(ink, 255, .06);
    }
    const surface = mix(tint, 0, .70);
    const values = {
      '--apple-now-playing-base': color(base), '--apple-now-playing-fg': color(fg), '--apple-now-playing-accent': color(ink), '--apple-now-playing-muted': color(ink, .86),
      '--apple-now-playing-idle': color(ink, .45), '--apple-now-playing-near': color(ink, .66), '--apple-now-playing-unlit': color(fg, .64),
      '--apple-now-playing-surface': color(surface, .98), '--apple-now-playing-settings-glass': color(surface, .76),
      '--apple-now-playing-inset': color(mix(tint, 0, .86), .30),
      '--apple-now-playing-hover': color(ink, .15), '--apple-now-playing-track': color(ink, .32),
      '--apple-now-playing-selected': color(ink, .96),
      '--apple-now-playing-selected-ink': color(mix(tint, 0, .67)),
      '--apple-now-playing-grip': color(ink, .48), '--apple-now-playing-focus': color(ink, .40),
      '--apple-now-playing-word-halo': color(fg, .35), '--apple-now-playing-meta-halo': color(ink, .20),
    };
    for (const [key, value] of Object.entries(values)) page.style.setProperty(key, value);
    return samples.map(rgb => color(rgb));
  }

  function updateBackdrop(id, url) {
    cancelPalette();
    const next = view.backdrop[1 - backdropIndex];
    const previous = view.backdrop[backdropIndex];
    function apply(colors, image) {
      if (!activity) return;
      const current = host.read();
      if (current.id !== id || current.cover !== url) return;
      const palette = applyBackdropTheme(colors);
      for (const [index, key] of ['--apple-now-playing-a', '--apple-now-playing-b', '--apple-now-playing-c'].entries()) {
        next.style.setProperty(key, palette[index]);
        page.style.setProperty(key, palette[index]);
      }
      fluidRenderer.setCover(image, palette);
      next.classList.toggle('apple-now-playing-cover-glow', Boolean(url && !colors));
      next.style.setProperty('--apple-now-playing-image', url ? 'url(' + JSON.stringify(url) + ')' : 'none');
      next.classList.remove('apple-now-playing-fading');
      next.classList.add('on');
      previous.classList.toggle('apple-now-playing-fading', !reducedMotion.matches);
      previous.classList.remove('on');
      backdropIndex = 1 - backdropIndex;
    }
    if (!url) { apply(); return; }
    const img = paletteImage = new Image();
    img.crossOrigin = 'anonymous';
    img.onerror = () => {
      if (img !== paletteImage) return;
      paletteImage = undefined;
      apply();
    };
    img.onload = () => {
      if (img !== paletteImage) return;
      paletteImage = undefined;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 12;
      const ctx = canvas.getContext('2d');
      if (!ctx) { apply(); return; }
      try {
        ctx.drawImage(img, 0, 0, 12, 12);
        const pixels = ctx.getImageData(0, 0, 12, 12).data;
        const colors = [];
        for (let column = 0; column < 3; column++) {
          const sums = [0, 0, 0];
          let weight = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            const x = (i / 4) % 12;
            if (Math.floor(x / 4) !== column) continue;
            const rgb = [pixels[i], pixels[i + 1], pixels[i + 2]];
            const saturation = (Math.max(...rgb) - Math.min(...rgb)) / 255;
            const w = .15 + saturation * 3.5;
            weight += w;
            rgb.forEach((value, index) => { sums[index] += value * w; });
          }
          const rgb = sums.map(value => value / weight);
          const middle = (Math.min(...rgb) + Math.max(...rgb)) / 2;
          const saturation = [1.8, .75, 1.22][column];
          const shade = [.87, .9, .67][column];
          const tint = rgb.map((value, i) => {
            const adjusted = middle + (value - middle) * saturation;
            return Math.round(clamp(adjusted * shade + [4, 9, 15][i], 5, 230));
          });
          const brightness = tint[0] * .213 + tint[1] * .715 + tint[2] * .072;
          const scale = Math.min(1, 116 / brightness);
          colors.push('rgb(' + tint.map(channel => Math.round(channel * scale)).join(',') + ')');
        }
        apply(colors, img);
      } catch (_) {
        apply(undefined, img);
      }
    };
    img.src = url;
  }

  function refreshSettingsSource() {
    if (!lyricSettings && !view?.lyricRefresh) return;
    const id = host.trackId();
    if (lyricSettings) {
      const shown = id && lyricTrackId === id && !restartLyrics ? lyricSource : '打开播放页后加载';
      const customName = shown === lyricSource ? lyricDetails.customSourceName : '';
      text(lyricSettings.source, customName ? customName + '（' + shown + '）' : shown);
    }
    const pending = !!manualLyricRefresh?.request;
    const message = manualLyricRefresh?.id === id ? manualLyricRefresh.message : '';
    for (const controls of [lyricSettings, view?.lyricRefresh]) {
      if (!controls) continue;
      const { button, result } = controls;
      button.disabled = pending;
      text(button, pending ? '正在刷新…' : '刷新本曲歌词');
      text(result, message || '');
      result.hidden = !message;
    }
  }

  function setLyricSource(value) {
    lyricSource = value;
    refreshSettingsSource();
    renderSourceDetails();
  }

  function setLyricStatus(status) {
    text(view.status, status);
    view.status.hidden = tab !== 'lyrics' || lyrics.length > 0;
  }

  function parseTimedSuffixes(line, offset) {
    const words = [], markers = [...line.matchAll(/\((\d+),(\d+)\)/g)];
    let from = 0;
    for (const marker of markers) {
      const text = line.slice(from, marker.index);
      if (text) words.push({ time: Math.max(0, Number(marker[1]) - offset), duration: Number(marker[2]), text });
      from = marker.index + marker[0].length;
    }
    return { words, trailing: line.slice(from), hasTiming: markers.length > 0 };
  }

  function parseLyricifySyllable(raw) {
    const rows = [];
    const offset = Number(raw.match(/^\[offset:(-?\d+)\]/m)?.[1]) || 0;
    let lead;
    for (const line of raw.split(/\r?\n/)) {
      const header = line.match(/^\[([0-8])\](.*)$/);
      if (!header) continue;
      const parsed = parseTimedSuffixes(header[2], offset);
      const words = parsed.words.filter(word => Number.isSafeInteger(word.time + word.duration));
      const timed = words.filter(word => word.duration > 0 && word.text.trim());
      if (!timed.length) continue;
      const time = Math.min(...timed.map(word => word.time));
      const end = Math.max(...timed.map(word => word.time + word.duration));
      if (parsed.trailing) words.push({ time: end, duration: 0, text: parsed.trailing });
      const flag = Number(header[1]);
      const row = { time, end, content: words.map(word => word.text).join('').trim(), words,
        side: flag % 3 === 2 ? 'right' : 'left', backing: flag >= 6, backingLines: [] };
      if (row.backing && lead) lead.backingLines.push(row);
      else {
        rows.push(row);
        if (!row.backing) lead = row;
      }
    }
    return rows.sort((a, b) => a.time - b.time);
  }

  function parseQQLyrics(payload) {
    function qrcRows(raw) {
      const result = [];
      const offset = Number((raw || '').match(/^\[offset:(-?\d+)\]/m)?.[1]) || 0;
      for (const line of String(raw || '').split(/\r?\n/)) {
        const header = line.match(/^\[(\d+),(\d+)\](.*)$/);
        if (!header) continue;
        const { words, trailing, hasTiming } = parseTimedSuffixes(header[3], offset);
        if (trailing) words.push({ time: Math.max(0, Number(header[1]) - offset), duration: 0, text: trailing });
        const content = (hasTiming ? words.map(w => w.text).join('') : header[3]).trim();
        if (!content || content === '//' || /纯音乐[，,、 ]?请欣赏/.test(content)) continue;
        result.push({ time: Math.max(0, Number(header[1]) - offset), end: Math.max(0, Number(header[1]) + Number(header[2]) - offset),
          content, words, side: 'left', backing: false, backingLines: [] });
      }
      return result.sort((a,b) => a.time - b.time);
    }
    const decodeEntities = value => String(value || '').replace(/&(?:quot|apos|amp|lt|gt);|&#(x[0-9a-f]+|\d+);/gi, (match, number) => {
      if (number) {
        const n = number[0].toLowerCase() === 'x' ? parseInt(number.slice(1), 16) : Number(number);
        return n >= 0 && n <= 0x10ffff ? String.fromCodePoint(n) : match;
      }
      return ({'&quot;':'"', '&apos;':"'", '&amp;':'&', '&lt;':'<', '&gt;':'>'})[match.toLowerCase()] || match;
    });
    function unwrapQrcLine(line) {
      const text = line?.content;
      if (!text || !['(', '（'].includes(text[0])) return;
      const closers = [];
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '(' || char === '（') closers.push(char === '(' ? ')' : '）');
        else if (char === ')' || char === '）') {
          if (closers.pop() !== char || (!closers.length && i !== text.length - 1)) return;
        }
      }
      const content = text.slice(1, -1).trim();
      if (closers.length || !content) return;
      if (!line.words?.length) return { ...line, content };

      // Select the same text range from the original timed fragments, including internal spaces.
      const raw = line.words.map(word => word.text).join('');
      const start = raw.indexOf(content, raw.indexOf(text[0]) + 1);
      const end = start + content.length;
      let offset = 0;
      const words = [];
      for (const word of line.words) {
        const from = Math.max(0, start - offset);
        const to = Math.min(word.text.length, end - offset);
        if (from < to) words.push({ ...word, text: word.text.slice(from, to) });
        offset += word.text.length;
      }
      return { ...line, content, words };
    }

    function sidecarMap(raw) {
      if (/^\[\d+,\d+\]/m.test(raw || '')) return new Map(qrcRows(raw).map(row => [row.time, row]));
      return new Map([...parseLrc(decodeEntities(raw))].map(([time, content]) => [time, { content }]));
    }
    const rows = payload.format === 'qrc' ? qrcRows(payload.content) :
      [...parseLrc(decodeEntities(payload.content))].filter(([,v]) => v && v !== '//' && !/纯音乐[，,、 ]?请欣赏/.test(v))
        .map(([time,content]) => ({ time, content, words: [], side: 'left', backing: false, backingLines: [] }));
    const translation = sidecarMap(payload.translation), roman = sidecarMap(payload.romanization);
    const near = (map,time) => {
      let best, distance = 31;
      for (const [at,value] of map) if (value.content !== '//' && Math.abs(at-time) < distance) { best=value;distance=Math.abs(at-time); }
      return best;
    };
    return rows.map(row => {
      const backing = payload.format === 'qrc' ? unwrapQrcLine(row) : undefined;
      let match = near(roman, row.time);
      let translated = near(translation, row.time);
      if (backing) {
        row = { ...backing, backing: true, side: 'right' };
        match = unwrapQrcLine(match) || match;
        translated = unwrapQrcLine(translated) || translated;
      }
      const words = match?.words?.filter(word => word.text.trim()) || [];
      const timed = words.length && words.every((word, index) => word.duration > 0 &&
        Number.isSafeInteger(word.time + word.duration) && (!index || word.time >= words[index - 1].time));
      return { ...row, translation: translated?.content || '', roman: match?.content || '',
        romanWords: timed ? match.words : undefined };
    });
  }

  const lyricCacheVersion = 1;
  const lyricCacheMaxAge = 7 * 24 * 60 * 60 * 1000;
  const lyricSourcesKey = storagePrefix + 'lyric-sources';
  const builtInLyricSources = {
    amll: { name: 'AMLL TTML', formats: ['AMLL TTML'] },
    qq: { name: 'QQ 音乐', formats: ['QQ 音乐 QRC', 'QQ 音乐 LRC'] },
    netease: { name: '网易云音乐', formats: ['网易云 YRC', '网易云 LRC'] },
  };
  const customLyricFormatLabels = {
    lrc: 'LyRiC 歌词', ttml: 'TTML 歌词', yrc: 'YRC 歌词（网易云逐词）',
    qrc: 'QRC 歌词（QQ 音乐逐词）', lys: 'Lyricify Syllable 歌词',
  };
  const customLyricFormats = Object.keys(customLyricFormatLabels);
  const validLyricSources = [...Object.values(builtInLyricSources).flatMap(source => source.formats),
    ...customLyricFormats.map(format => '自定义 ' + format.toUpperCase())];
  let lyricSourceSettings = normalizeLyricSources(storedObject(lyricSourcesKey));
  const lyricCacheWrites = new Map();

  function customLyricUrl(template, song) {
    if (typeof template !== 'string' || template.length > 2048) return;
    const address = template.split('#', 1)[0];
    const authority = address.match(/^https:\/\/[^/?#]+/i)?.[0];
    const tokenPattern = /\[([A-Z][A-Z0-9_]*)\]/g;
    if (!authority || /\[[A-Z][A-Z0-9_]*\]/.test(authority)) return;
    const tokens = [...address.slice(authority.length).matchAll(tokenPattern)];
    if (!tokens.length || tokens.some(([, token]) => !/^(?:NCM_ID|SONG_(?:NAME|ARTISTS|ALIAS)(?:_URI)?)$/.test(token))) return;
    const artistNames = Array.isArray(song.artistItems) ? song.artistItems.map(item => item?.name).filter(Boolean).join(',') : '';
    const fields = {
      NCM_ID: song.id,
      SONG_NAME: song.name || '',
      SONG_ARTISTS: artistNames || song.artist || '',
      SONG_ALIAS: Array.isArray(song.aliases) ? song.aliases.join(',') : '',
    };
    try {
      const url = new URL(address.replace(tokenPattern, (_, token) => {
        const value = fields[token.replace(/_URI$/, '')];
        return token.endsWith('_URI') ? encodeURIComponent(value) : value;
      }));
      if (url.protocol === 'https:' && !url.username && !url.password) return url;
    } catch (_) { /* Invalid URL templates cannot be used as sources. */ }
  }

  function lyricSourceWebsite(value) {
    if (typeof value !== 'string' || !value || value.length > 2048) return;
    try {
      const url = new URL(value);
      if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) return url.href;
    } catch (_) { /* Invalid websites are not shown as links. */ }
  }

  function normalizeLyricSources(settings) {
    const custom = Array.isArray(settings.custom) ? settings.custom.filter(source =>
      /^custom-[a-z\d-]+$/.test(source?.id) && typeof source.name === 'string' && source.name.trim() &&
      customLyricFormats.includes(source.format) && customLyricUrl(source.url, { id: '1' }))
      .map(source => ({ ...source, website: lyricSourceWebsite(source.website) || '',
        description: typeof source.description === 'string' ? source.description : '' })) : [];
    const known = [...Object.keys(builtInLyricSources), ...custom.map(source => source.id)];
    const order = [...new Set([...(Array.isArray(settings.order) ? settings.order : []), ...known])].filter(id => known.includes(id));
    return { order, custom, revision: Number.isSafeInteger(settings.revision) && settings.revision > 0 ? settings.revision : 0 };
  }

  function lyricSourceRank(source, details, order) {
    const id = details.customSourceId || Object.keys(builtInLyricSources).find(id => builtInLyricSources[id].formats.includes(source));
    const index = order.indexOf(id);
    return index < 0 ? Infinity : index * 2 + (builtInLyricSources[id]?.formats.indexOf(source) || 0);
  }

  function hasLyricText(rows) {
    return rows.some(row => row.content || row.backingLines.some(vocal => vocal.content));
  }

  function validLyricCache(entry, id) {
    const validWords = words => Array.isArray(words) && words.every(word => typeof word?.text === 'string' &&
      (word.time === undefined ? word.duration === undefined : Number.isFinite(word.time) && Number.isFinite(word.duration)) &&
      (word.ruby === undefined || Array.isArray(word.ruby) && word.ruby.every(part => typeof part?.word === 'string' &&
        Number.isFinite(part.startTime) && Number.isFinite(part.endTime))));
    const validVocal = vocal => typeof vocal?.content === 'string' && Number.isFinite(vocal.time) &&
      (vocal.end === undefined || Number.isFinite(vocal.end)) && validWords(vocal.words) &&
      (vocal.romanWords === undefined || validWords(vocal.romanWords)) &&
      (vocal.roman === undefined || typeof vocal.roman === 'string') &&
      (vocal.translation === undefined || typeof vocal.translation === 'string');
    const details = entry?.details;
    return entry?.version === lyricCacheVersion && entry.id === id && Number.isFinite(entry.savedAt) &&
      validLyricSources.includes(entry.source) && Array.isArray(entry.rows) &&
      entry.rows.every(row => validVocal(row) && Array.isArray(row.backingLines) && row.backingLines.every(validVocal)) &&
      hasLyricText(entry.rows) &&
      Array.isArray(details?.supplements) && details.supplements.every(item => typeof item === 'string') &&
      Array.isArray(details.metadata) && details.metadata.every(item => typeof item?.key === 'string' && typeof item.value === 'string') &&
      Array.isArray(details.contributors) && details.contributors.every(item => typeof item?.role === 'string' && typeof item.name === 'string');
  }

  function writeLyricCache(fs, directory, file, entry) {
    const write = (lyricCacheWrites.get(file) || Promise.resolve()).then(async () => {
      await fs.mkdir(directory);
      await fs.mkdir(directory + '\\lyrics-cache');
      await fs.writeFile(file, new Blob([JSON.stringify(entry)], { type: 'application/json' }));
      return true;
    }).catch(error => {
      console.warn('[AppleNowPlaying] 无法保存歌词缓存', error);
      return false;
    });
    lyricCacheWrites.set(file, write);
    write.then(() => {
      if (lyricCacheWrites.get(file) === write) lyricCacheWrites.delete(file);
    });
    return write;
  }

  async function openLyricCache(id) {
    const { app, fs } = window.betterncm || {};
    if (typeof app?.getDataPath !== 'function' || typeof fs?.readFileText !== 'function' ||
        typeof fs.mkdir !== 'function' || typeof fs.writeFile !== 'function') return;
    let cache;
    try {
      const base = await app.getDataPath();
      if (typeof base !== 'string' || !/^[A-Za-z]:[\\/]/.test(base)) return;
      const directory = base.replace(/[\\/]+$/, '').replace(/\//g, '\\') + '\\AppleNowPlaying-data';
      const file = directory + '\\lyrics-cache\\' + id + '.json';
      cache = { fs, directory, file };
      const writing = lyricCacheWrites.get(file);
      if (writing) await writing;
      const entry = JSON.parse(await fs.readFileText(file));
      if (validLyricCache(entry, id)) cache.entry = entry;
    } catch (_) { /* Missing or unreadable cache entries fall back to network sources. */ }
    return cache;
  }

  function publishLyrics(rows, source, details, duration) {
    const visible = activity && snapshot?.id === lyricTrackId;
    const anchor = visible ? captureLyricAnchor() : undefined;
    const focusedTime = visible && view.lyrics.contains(document.activeElement) ? lyrics[lyricFocus]?.time : undefined;
    if (details) lyricDetails = details;
    rawLyrics = rows;
    lyrics = prepareLyrics(rows, duration);
    lyricFocus = -1;
    setLyricSource(source);
    if (!visible) {
      if (lyricView && !lyricView.released) lyricView.releaseRows();
      return;
    }
    const now = performance.now();
    renderLyrics();
    if (browseUntil > now) restoreLyricAnchor(anchor);
    if (focusedTime !== undefined) {
      const index = lyrics.findIndex(row => row.kind === 'line' && row.time >= focusedTime);
      if (index >= 0) setLyricFocus(index,true,false);
    }
    syncLyrics(playbackTime(now),now,false);
    if (previewPosition) showPreview(previewPosition.x);
  }

  async function loadLyrics(id) {
    const sameTrack = lyricTrackId === id;
    lyricTrackId = id;
    restartLyrics = false;
    lyricRequest?.abort();
    lyricRequest = undefined;
    if (!sameTrack) {
      lyricDetails = { contributors: [], metadata: [], supplements: [] };
      rawLyrics = [];
      lyrics = [];
      lyricView.set([], preferences, 0, 0);
      lyricFocus = -1;
      browseUntil = 0;
      updateLyricTools();
    }
    if (!/^\d+$/.test(id)) {
      const status = id ? '暂无同步歌词' : '暂无正在播放的歌曲';
      setLyricSource(status);
      setLyricStatus(status);
      return;
    }
    if (!lyrics.length) {
      setLyricSource('正在加载');
      setLyricStatus('正在加载歌词…');
    }
    const request = lyricRequest = new AbortController();
    const current = () => activity && lyricRequest === request && !request.signal.aborted &&
      snapshot?.id === id && host.trackId() === id;
    const song = snapshot;
    const sources = lyricSourceSettings;
    try {
      const cache = await openLyricCache(id);
      if (!current()) return;
      const entry = cache?.entry;
      const sourcesChanged = (entry?.sourceRevision ?? 0) !== sources.revision;
      const cached = sourcesChanged && entry?.details.customSourceId ? undefined : entry;
      if (cached) {
        publishLyrics(cached.rows, cached.source, cached.details, snapshot.duration);
        const age = Date.now() - cached.savedAt;
        if (!sourcesChanged && age >= 0 && age < lyricCacheMaxAge) return;
      }
      await fetchLyricSources(song, request, current, (rows, source, details) => {
        const valid = hasLyricText(rows);
        if (!cached || (sourcesChanged && valid)) publishLyrics(rows, source, details, snapshot.duration);
        if (!cache || !valid) return;
        if (cached && !sourcesChanged &&
            lyricSourceRank(source, details, sources.order) > lyricSourceRank(cached.source, cached.details, sources.order)) return;
        writeLyricCache(cache.fs, cache.directory, cache.file, { version: lyricCacheVersion, id,
          sourceRevision: sources.revision, savedAt: Date.now(), source, details, rows });
      }, { cached, sources });
    } catch (error) {
      if (!current()) return;
      if (!lyrics.length) publishLyrics([], '歌词获取失败', undefined, snapshot.duration);
      console.warn('[AppleNowPlaying] 无法处理歌词', error);
    } finally {
      if (lyricRequest === request) lyricRequest = undefined;
    }
  }

  async function fetchLyricSources(song, request, current, accept, { cached, sources, cacheMode }) {
    const { id, name, artist, album, duration } = song;
    const track = { id, title: name, artist, album, durationMs: Math.round(duration * 1000) };
    const nativeUrl = new URL('/api/song/lyric/v1',window.APP_CONF?.domain || 'https://music.163.com');
    nativeUrl.search='id='+id+'&lv=0&tv=0&rv=0&kv=0&yv=0&ytv=0&yrv=0&cp=false';
    const amllPath = 'ncm-lyrics/' + id + '.ttml';
    const amllSources = [
      ['GDBA', 'https://amll-ttml-db.gbclstudio.cn/' + amllPath],
      ['作者镜像', 'https://amll-ttml-db.stevexmh.net/ncm/' + id],
      ['GitHub AMLL', 'https://raw.githubusercontent.com/amll-dev/amll-ttml-db/refs/heads/main/' + amllPath],
    ];
    let nativeRequest, nativeFallback;
    const readNative = () => nativeRequest || (nativeRequest = requestLyrics(nativeUrl, request, 5000, response => response.json(), cacheMode));
    const validNative = data => data && typeof data === 'object' && (data.code == null || data.code === 200);
    const providers = {
      async amll() {
        for (const [mirror, url] of amllSources) {
          const result = await requestLyrics(url, request, 4000, response => response.text(), cacheMode);
          if (!current()) return;
          const rows = result.data ? parseTtml(result.data) : [];
          if (!rows.length) continue;
          const details = { url, mirror, metadata: extractTtmlMetadata(result.data), contributors: [], supplements: [] };

          // Native sidecars can fill missing fields without replacing the selected TTML.
          const missing = vocal => !vocal.translation || !vocal.roman || (vocal.roman && !vocal.romanWords?.length);
          const needsSidecars = rows.some(row => missing(row) || row.backingLines.some(missing));
          const deferWrite = needsSidecars && cached?.source === 'AMLL TTML' && cached.details.supplements.length;
          if (!deferWrite) accept(rows, 'AMLL TTML', details);
          if (!needsSidecars) return true;
          const { data } = await readNative();
          if (!current() || !validNative(data)) return true;
          const merged = mergeLyricSidecars(rows, parseNativeLyrics(data, true));
          const fields = ['translation', 'roman'].filter(field => merged.some((row, i) =>
            (row[field] && !rows[i][field]) || row.backingLines.some((vocal, j) => vocal[field] && !rows[i].backingLines[j]?.[field])));
          if (!fields.includes('roman') && merged.some((row, i) =>
            (row.romanWords?.length && !rows[i].romanWords?.length) ||
            row.backingLines.some((v, j) => v.romanWords?.length && !rows[i].backingLines[j]?.romanWords?.length))) fields.push('roman');
          if (fields.length) accept(merged, 'AMLL TTML', { ...details,
            contributors: fields.includes('translation') ? extractNativeContributors(data).filter(c => c.role.includes('译文')) : [],
            supplements: fields.map(field => '网易云' + (field === 'roman' ? '罗马音' : '译文')),
          });
          else if (deferWrite) accept(rows, 'AMLL TTML', details);
          return true;
        }
      },
      async qq() {
        const qq = await window.AppleNowPlayingQQLyrics?.fetchLyrics(track, request.signal).catch(error => {
          console.warn('[AppleNowPlaying] QQ 歌词不可用', error);
          return null;
        });
        if (!current() || !qq) return;
        const rows = parseQQLyrics(qq);
        if (!rows.length) return;
        accept(rows, 'QQ 音乐 ' + (qq.format === 'qrc' ? 'QRC' : 'LRC'), {
          url: qq.url, contributors: [], supplements: [],
          metadata: [{ key: 'QQ 匹配歌曲', value: qq.candidate?.title || track.title },
            { key: 'QQ 艺人', value: qq.candidate?.artist || track.artist }],
        });
        return true;
      },
      async netease() {
        const { data, missing } = await readNative();
        if (!current()) return;
        const available = validNative(data);
        const rows = available ? parseNativeLyrics(data, true) : [];
        const pure = available && (data.nolyric === true || /纯音乐[，,、 ]?请欣赏/.test(data.lrc?.lyric || ''));
        const source = rows.some(row => row.words.length) ? '网易云 YRC' : pure ? '纯音乐' :
          rows.length ? '网易云 LRC' : available || missing ? '暂无同步歌词' : '歌词获取失败';
        const details = { url: nativeUrl.href, contributors: available ? extractNativeContributors(data) : [], metadata: [], supplements: [] };
        if (rows.length && source !== '纯音乐') {
          accept(rows, source, details);
          return true;
        }
        nativeFallback = { source, details };
      },
    };
    for (const sourceId of sources.order) {
      if (!current()) return;
      if (providers[sourceId]) {
        if (await providers[sourceId]()) return;
        continue;
      }
      const custom = sources.custom.find(source => source.id === sourceId);
      if (!custom) continue;
      const url = customLyricUrl(custom.url, song);
      if (!url) continue;
      const result = await requestLyrics(url, request, 4000, async response => {
        const body = (await response.text()).trim();
        return body.length <= 2 * 1024 * 1024 ? body : '';
      }, cacheMode, true);
      if (!current()) return;
      if (!result.data) continue;
      let rows;
      try {
        if (custom.format === 'ttml') rows = parseTtml(result.data);
        else if (custom.format === 'lys') rows = parseLyricifySyllable(result.data);
        else if (custom.format === 'qrc') {
          const content = result.data.startsWith('[') ? result.data : await window.AppleNowPlayingQQCodec?.decode(result.data);
          rows = parseQQLyrics({ format: 'qrc', content });
        } else rows = parseNativeLyrics({ [custom.format]: { lyric: result.data } }, custom.format === 'yrc');
      } catch (_) { continue; }
      if (!current()) return;
      if (!hasLyricText(rows)) continue;
      accept(rows, '自定义 ' + custom.format.toUpperCase(), {
        url: url.origin, customSourceId: custom.id, customSourceName: custom.name, contributors: [],
        metadata: custom.website ? [{ key: '歌词源网站', value: custom.website }] : [], supplements: [],
      });
      return;
    }
    if (current()) accept([], nativeFallback?.source || '歌词获取失败', nativeFallback?.details);
  }

  async function refreshCurrentLyrics() {
    if (manualLyricRefresh?.request || lifetime.signal.aborted) return;
    const song = host.read();
    const { id } = song;
    const job = manualLyricRefresh = { id };
    if (!/^\d+$/.test(id)) {
      job.message = '请先选择一首歌曲';
      refreshSettingsSource();
      return;
    }
    const request = job.request = new AbortController();
    const current = () => !request.signal.aborted && host.trackId() === id;
    const sources = lyricSourceSettings;
    refreshSettingsSource();
    try {
      const cache = await openLyricCache(id);
      if (!current()) return;
      const previous = cache?.entry || (lyricTrackId === id ? { source: lyricSource, details: lyricDetails } : undefined);
      if (host.canFetchPublicQQLyrics()) window.AppleNowPlayingQQLyrics?.setNativeFetch?.((url, signal) => host.fetchPublicQQLyrics(url, signal));
      let updated;
      await fetchLyricSources(song, request, current, (rows, source, details) => {
        if (hasLyricText(rows)) updated = { version: lyricCacheVersion, id, sourceRevision: sources.revision,
          savedAt: Date.now(), source, details, rows };
      }, { cached: previous, sources, cacheMode: 'reload' });
      if (!current()) return;
      if (!updated) {
        job.message = cache?.entry || (lyricTrackId === id && rawLyrics.length) ? '未获取到新歌词，现有歌词已保留' : '未获取到可用歌词';
        return;
      }
      if (lyricTrackId === id && lyricRequest) {
        lyricRequest.abort();
        lyricRequest = undefined;
      }
      lyricTrackId = id;
      restartLyrics = false;
      publishLyrics(updated.rows, updated.source, updated.details, song.duration);
      const saved = cache && await writeLyricCache(cache.fs, cache.directory, cache.file, updated);
      job.message = saved ? '歌词已刷新' : '歌词已刷新，本次未写入本地缓存';
    } catch (error) {
      if (current()) job.message = '刷新歌词失败';
      console.warn('[AppleNowPlaying] 刷新歌词失败', error);
    } finally {
      job.request = undefined;
      refreshSettingsSource();
    }
  }

  function captureLyricAnchor() {
    return lyricView.player.scrollOffset;
  }

  function restoreLyricAnchor(offset) {
    if (!Number.isFinite(offset) || !lyrics.length || browseUntil <= performance.now()) return;
    lyricView.player.setBrowseOffset(offset);
  }

  function renderLyrics() {
    const offset = captureLyricAnchor();
    const ms = Math.max(0, Math.round(playbackTime(performance.now()) * 1000 + currentOffset()));
    lyricView.set(lyrics, preferences, (snapshot?.duration || 0) * 1000, ms);
    restoreLyricAnchor(offset);
    lyricFocus = lyricView.nodes.keys().next().value ?? -1;
    view.status.hidden = copyMode || tab !== 'lyrics' || lyrics.length > 0;
    if (!lyrics.length) setLyricStatus(lyricSource);
    if (copyMode) updateCopyText();
    updateLyricTools();
  }

  function browseLyrics() {
    if (!activity || tab !== 'lyrics' || copyMode) return;
    browseUntil = performance.now() + 5000;
    page.dataset.lyricBrowsing = 'true';
    if (preferences.scrollbar) {
      view.lyrics.classList.add('apple-now-playing-user-scrolling');
      clearTimeout(lyricScrollHideTimer);
      lyricScrollHideTimer = setTimeout(clearLyricScrollIndicator, 750);
    }
  }

  function setLyricFocus(index, focus = false, scroll = true) {
    if (!lyricView.nodes.has(index)) return;
    lyricFocus = index;
    if (focus && scroll) lyricView.reveal(index);
    else lyricView.setFocus(index, focus);
  }

  function handleLyricKeys(event) {
    if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
      event.preventDefault();
      event.stopPropagation();
      const node = lyricView.nodes.get(lyricFocus);
      const rect = (node?.isConnected ? node : view.lyrics).getBoundingClientRect();
      showRowMenu(node?.isConnected ? lyricFocus : -1, rect.left + 20, rect.top + 20);
      return;
    }
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      event.target.closest('[data-action="lyric"]')?.click();
      event.stopPropagation();
      return;
    }
    const step = { ArrowDown: 1, ArrowUp: -1, Home: -lyrics.length, End: lyrics.length }[event.key];
    if (!step) return;
    event.preventDefault();
    event.stopPropagation();
    browseLyrics();
    let next = clamp(lyricFocus + step, 0, lyrics.length - 1);
    const direction = event.key === 'End' || event.key === 'ArrowUp' ? -1 : 1;
    while (next >= 0 && next < lyrics.length && !lyricView.nodes.has(next)) next += direction;
    setLyricFocus(next, true);
  }

  function positionLyrics() {
    if (tab === 'lyrics' && activity && !copyMode) lyricView.player.calcLayout(true);
  }

  function lyricIndexAt(milliseconds) {
    let low = 0, high = lyrics.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (lyrics[mid].time <= milliseconds) low = mid + 1;
      else high = mid;
    }
    return low - 1;
  }

  function syncLyrics(seconds, time, smooth = true) {
    if (tab !== 'lyrics' || copyMode || !lyrics.length) return;
    if (lyricView.released) renderLyrics();
    if (browseUntil && time >= browseUntil && !lyricView.player.isManualScrolling) {
      browseUntil = 0;
      lyricView.player.resetScroll();
      lyricView.player.calcLayout();
      page.dataset.lyricBrowsing = 'false';
    }
    const rate = clock?.running && !drag && !pendingSeek ? clock.rate : 0;
    lyricView.tick(seconds * 1000 + currentOffset(), time, rate, !smooth);
    const current = lyricView.currentNode;
    if (current && !view.lyrics.contains(document.activeElement)) setLyricFocus(Number(current.dataset.index));
    if (browseUntil && preferences.scrollbar) {
      const p = lyricView.player;
      const [min, max] = p.scrollBoundary;
      if (max > min) {
        const percent = Math.round(clamp((p.scrollOffset - min) / (max - min), 0, 1) * 100);
        if (view.browseBar.getAttribute('aria-valuenow') !== String(percent)) {
          view.browseBar.setAttribute('aria-valuenow', percent);
          view.browseBar.style.setProperty('--scroll-fraction', percent + '%');
        }
      }
    }
  }

  function createQueueRow(item) {
    const wrapper = document.createElement('div');
    if (item.kind === 'heading') {
      wrapper.className = 'apple-now-playing-queue-heading';
      wrapper.textContent = item.label;
      wrapper.setAttribute('role', 'presentation');
      return wrapper;
    }
    wrapper.className = 'apple-now-playing-queue-item';
    wrapper.setAttribute('role', 'listitem');
    wrapper.setAttribute('aria-posinset', String(item.queueIndex + 1));
    wrapper.setAttribute('aria-setsize', String(snapshot.queue.length));
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'apple-now-playing-queue-row';
    button.dataset.action = 'queue-play';
    button.dataset.resourceId = item.resourceId;
    button.dataset.resourceType = item.resourceType;
    button.disabled = !snapshot.can.queuePlay || !item.playable;
    button.draggable = snapshot.can.queueEdit && item.editable;
    if (item.current) button.setAttribute('aria-current', 'true');
    const title = document.createElement('span'), artist = document.createElement('span');
    title.className = 'apple-now-playing-queue-song';
    artist.className = 'apple-now-playing-queue-artist';
    title.textContent = item.name;
    artist.textContent = item.artist;
    button.append(title, artist);
    wrapper.append(button);
    if (snapshot.can.queueEdit && item.editable) {
      const edit = menuButton(wrapper, 'queue-menu', '⋯', { resourceId: item.resourceId, resourceType: item.resourceType });
      edit.className = 'apple-now-playing-queue-edit';
      edit.setAttribute('aria-label', '管理队列项：' + item.name);
    }
    return wrapper;
  }

  function renderQueue() {
    if (!snapshot) return;
    const { queue, id, resourceId, queueSource } = snapshot;
    const current = (resourceId || id) + '|' + queueSource + '|' + snapshot.mode + '|' + snapshot.can.queueEdit;
    if (queue === queueReference && current === queueCurrent) return;
    const anchor = queueView.capture();
    if (!view.queueMenu.hidden) closePopups(view.queueMenu.contains(document.activeElement));
    const sameQueue = queue === queueReference;
    queueReference = queue;
    queueCurrent = current;
    text(view.queueSource, queueSource || '');
    view.queueSource.hidden = !queueSource;
    const ordered = queue.map((item, index) => ({ item, index })).filter(({ item }) => item)
      .sort((a, b) => (number(a.item.displayOrder) ?? a.index) - (number(b.item.displayOrder) ?? b.index));
    const identities = new Map();
    for (const { item } of ordered) {
      const key = item.resourceId + '|' + (item.resourceType || 'track');
      identities.set(key, (identities.get(key) || 0) + 1);
    }
    const currentIndex = ordered.findIndex(({ item }) => resourceId ? String(item.resourceId) === resourceId :
      String(item.trackId || item.track?.id || item.localTrack?.id) === id);
    queueRows = [];
    let previousSource = queueSource;
    ordered.forEach(({ item, index }, queueIndex) => {
      const track = item.track?.name ? item.track : item.localTrack?.origin || item.localTrack || item;
      const source = item.text || item.fromInfo?.sourceData?.name || '';
      if (source && source !== previousSource) {
        queueRows.push({ kind: 'heading', key: 'source-' + index, label: source });
        previousSource = source;
      }
      const identity = String(item.resourceId || '') + '|' + (item.resourceType || 'track');
      queueRows.push({
        kind: 'track', key: identities.get(identity) === 1 ? identity : identity + '|' + index,
        resourceId: String(item.resourceId || ''), resourceType: String(item.resourceType || 'track'),
        playable: !!item.resourceId && identities.get(identity) === 1,
        editable: !!item.resourceId && identities.get(identity) === 1 && ['track', 'localTrack', 'downloadTrack'].includes(item.resourceType || 'track'),
        name: track.name || '未知歌曲', artist: artists(track.artists || track.ar),
        queueIndex, current: queueIndex === currentIndex,
      });
    });
    if (!queueRows.length) queueRows.push({ kind: 'heading', key: 'empty', label: '播放队列为空' });
    queueView.set(queueRows, row => row.key);
    if (sameQueue) queueView.restore(anchor);
    else if (panelPositions.queue?.id === snapshot.id) queueView.restore(panelPositions.queue.anchor);
    else queueView.scrollTo(Math.max(0, queueRows.findIndex(row => row.current)), .35, false);
  }

  function showQueueMenu(id, type, x, y) {
    const rows = queueRows.filter(row => row.kind === 'track');
    const index = rows.findIndex(row => row.resourceId === id && row.resourceType === type);
    if (index < 0) return;
    closePopups();
    queueMenuTarget = { id, type };
    view.queueMenu.replaceChildren();
    const row = rows[index];
    const current = rows.findIndex(item => item.current);
    const editable = snapshot.can.queueEdit && row.editable;
    const next = menuButton(view.queueMenu, 'queue-next', '下一首播放', {}, !editable || !snapshot.can.queueNext || index === current || index === current + 1);
    if (!snapshot.can.queueNext) next.title = '当前播放模式由网易云决定续播，请在原生队列中操作';
    menuButton(view.queueMenu, 'queue-up', '上移', {}, !editable || index === 0);
    menuButton(view.queueMenu, 'queue-down', '下移', {}, !editable || index === rows.length - 1);
    menuButton(view.queueMenu, 'queue-remove', '从当前队列移除', {}, !editable);
    menuButton(view.queueMenu, 'host-queue', '在网易云管理', {}, !snapshot.can.queue);
    popupFocus = document.activeElement;
    popupAt(view.queueMenu, x, y);
    view.queueMenu.querySelector('button:not(:disabled)')?.focus();
  }

  function mergedMetadata() {
    const supplement = details?.id === snapshot?.songId ? details : {};
    const artists = Array.isArray(snapshot?.artistItems) && snapshot.artistItems.length ? snapshot.artistItems :
      supplement.artists || supplement.ar || [];
    const album = snapshot?.albumItem?.name ? snapshot.albumItem : supplement.album || supplement.al || {};
    return {
      artists, album,
      aliases: snapshot?.aliases?.length ? snapshot.aliases : supplement.alias || [],
      translated: snapshot?.translatedNames?.length ? snapshot.translatedNames : supplement.transNames || supplement.tns || [],
    };
  }

  function renderMetadata() {
    if (!snapshot) return;
    const data = mergedMetadata();
    const signature = JSON.stringify([snapshot.id, snapshot.name, snapshot.artist, snapshot.album, snapshot.quality, snapshot.can.navigate, data, preferences.alias]);
    if (signature === metadataSignature) return;
    metadataSignature = signature;
    text(view.title, snapshot.name || '暂无播放');
    view.title.title = snapshot.name;
    view.title.disabled = !snapshot.id || !snapshot.can.navigate;
    const aliases = (Array.isArray(data.aliases) ? data.aliases : []).filter(value => typeof value === 'string' && value !== snapshot.name);
    const translated = (Array.isArray(data.translated) ? data.translated : []).filter(value => typeof value === 'string' && value !== snapshot.name);
    const names = preferences.alias === 'alias' ? aliases.length ? aliases : translated :
      preferences.alias === 'translated' ? translated.length ? translated : aliases :
      preferences.alias === 'both' ? [...aliases, ...translated] : [];
    text(view.alias, [...new Set(names)].join(' / '));
    view.alias.hidden = !view.alias.textContent;
    view.alias.title = view.alias.textContent;
    view.sub.replaceChildren();
    if (Array.isArray(data.artists) && data.artists.length) {
      data.artists.forEach((artist, index) => {
        if (index) view.sub.append(' / ');
        const name = typeof artist === 'string' ? artist : artist.name;
        if (artist.id && snapshot.can.metadataNav) {
          menuButton(view.sub, 'detail-artist', name, { id: String(artist.id), trackId: snapshot.id });
        } else {
          view.sub.append(name || '');
        }
      });
    } else {
      view.sub.append(snapshot.artist);
    }
    if (data.album.name) {
      if (view.sub.textContent) view.sub.append(' — ');
      if (data.album.id && snapshot.can.metadataNav) {
        menuButton(view.sub, 'detail-album', data.album.name, { id: String(data.album.id), trackId: snapshot.id });
      } else {
        view.sub.append(data.album.name);
      }
    }
    view.sub.title = view.sub.textContent;
    text(view.quality, snapshot.quality || '');
    view.quality.hidden = !snapshot.quality;
  }

  async function loadDetails() {
    const id = snapshot?.songId;
    if (!activity || !id || detailTrackId === id) return;
    detailRequest?.abort();
    detailTrackId = id;
    details = undefined;
    const request = detailRequest = new AbortController();
    const hostId = snapshot.id;
    const base = window.APP_CONF?.domain || 'https://music.163.com';
    const url = new URL('/api/song/detail/', base);
    url.searchParams.set('ids', JSON.stringify([id]));
    const result = await requestLyrics(url, request, 5000, response => response.json());
    if (request.signal.aborted || detailRequest !== request || !activity || host.trackId() !== hostId) return;
    const song = result.data?.songs?.find(item => String(item.id) === id);
    details = song ? { ...song, id } : undefined;
    metadataSignature = '';
    detailRequest = undefined;
    dirty = true;
  }

  function showTrackMenu() {
    closePopups();
    view.menu.replaceChildren();
    const data = mergedMetadata();
    const id = snapshot?.id || '';
    const target = { trackId: id };
    menuButton(view.menu, 'detail-song', '在网易云查看歌曲详情', target, !id || !snapshot.can.navigate);
    for (const artist of data.artists) {
      if (artist?.id) menuButton(view.menu, 'detail-artist', '歌手：' + artist.name,
        { ...target, id: String(artist.id) }, !snapshot.can.metadataNav);
    }
    if (data.album.id) menuButton(view.menu, 'detail-album', '专辑：' + data.album.name,
      { ...target, id: String(data.album.id) }, !snapshot.can.metadataNav);
    menuButton(view.menu, 'add-playlist', '加入歌单', target, !snapshot.can.addPlaylist);
    menuButton(view.menu, 'copy-track', '复制歌曲名', target, !id);
    if (view.alias.textContent) menuButton(view.menu, 'copy-alias', '复制别名／译名', target);
    menuButton(view.menu, 'save-cover', '保存封面到本地', target, !window.AppleNowPlayingCoverSave || !/^https?:\/\//.test(snapshot?.cover || ''));
    if (!replacementEnabled()) menuButton(view.menu, 'cover', '打开网易云播放页', {}, !snapshot.can.cover);

    popupFocus = page.querySelector('[data-action="menu"]');
    const rect = popupFocus.getBoundingClientRect();
    popupAt(view.menu, rect.right - 220, rect.bottom + 8);
    popupFocus.setAttribute('aria-expanded', 'true');
    view.menu.querySelector('button:not(:disabled)')?.focus();
    setControlsHidden(false);
  }

  function queueVolume(target) {
    if (!activity || !Number.isFinite(target)) return;
    volumeQueued = clamp(target, 0, 1);
    pendingVolume = { target: volumeQueued, sent: false, until: performance.now() + 1200 };
    if (volumeTimer === undefined) {
      const delay = Math.max(0, 40 - (performance.now() - volumeSentAt));
      volumeTimer = setTimeout(flushVolume, delay);
    }
  }

  function flushVolume() {
    clearTimeout(volumeTimer);
    volumeTimer = undefined;
    if (!activity || volumeQueued === undefined) return;
    const target = volumeQueued;
    volumeQueued = undefined;
    const now = volumeSentAt = performance.now();
    pendingVolume = host.volume(target) ? { target, sent: true, confirmAfter: now + 160, until: now + 1200 } : undefined;
    dirty = true;
  }

  function finishVolumeGesture() {
    if (!activity) return;
    volumeGesture = undefined;
    view.volumeGroup.classList.remove('is-adjusting');
    flushVolume();
    if (pendingVolume) {
      pendingVolume.confirmAfter = performance.now() + 160;
      pendingVolume.until = performance.now() + 1200;
    }
  }

  function fillRange(range) {
    const fill = clamp(range.valueAsNumber / Number(range.max) * 100, 0, 100).toFixed(1) + '%';
    if (range.style.getPropertyValue('--fill') !== fill) range.style.setProperty('--fill', fill);
    const surface = range.closest('.apple-now-playing-volume-control');
    if (surface && surface.style.getPropertyValue('--fill') !== fill) surface.style.setProperty('--fill', fill);
  }

  function formatTime(seconds) {
    const value = Math.max(0, Math.floor(seconds));
    return Math.floor(value / 60) + ':' + String(value % 60).padStart(2, '0');
  }

  let nextTimelinePaint = 0, lastTimelinePosition = NaN;
  function renderTime(seconds, time) {
    syncLyrics(seconds, time);
    // Progress text and the track are coarse controls. Give every display
    // refresh to the lyrics without invalidating a range control at 160 Hz.
    if (clock?.running && !drag && !pendingSeek && time < nextTimelinePaint &&
        Math.abs(lastTimelinePosition - seconds) < .15) return;
    lastTimelinePosition = seconds;
    nextTimelinePaint = time + 1000 / 30;
    const duration = snapshot?.duration || 0;
    if ((!drag || drag.cancelled) && Math.abs(view.seek.valueAsNumber - seconds) >= .005) view.seek.value = seconds;
    fillRange(view.seek);
    text(view.elapsed, formatTime(seconds));
    text(view.remaining, '-' + formatTime(duration - seconds));
  }

  function seek(seconds, retry = false) {
    if (!activity || !snapshot?.can.seek || !Number.isFinite(seconds)) return;
    const current = host.read();
    if (current.id !== snapshot.id || !current.can.seek) return;
    const target = clamp(seconds, 0, current.duration);
    const now = performance.now();
    const previousOperation = pendingSeek;
    const operation = {
      id: current.id, target, from: current.position, receipt: current.audioReceipt, sentAt: now, until: now + 1400,
      retryOnResume: !retry && !current.playing && current.restored && Math.abs(current.position - target) > .035,
    };
    // The host can emit a position synchronously during command dispatch.
    pendingSeek = operation;
    if (!host.seek(operation.id, target)) { pendingSeek = previousOperation; return; }
    deferredSeek = seekAlignment = undefined;
    clearLyricScrollIndicator();
    browseUntil = 0;
    page.dataset.lyricBrowsing = 'false';
    lyricView.player.resetScroll();
    lyricView.lastTime = undefined;
    renderTime(target, now);
    dirty = true;
  }

  function settleSeek(time) {
    let settled = false;
    if (pendingSeek) {
      const operation = pendingSeek;
      const { position, speed, playing } = snapshot;
      const fresh = snapshot.hasAudioStream ? snapshot.audioReceipt > operation.receipt : position !== operation.from;
      const elapsed = Math.max(0, time - operation.sentAt) / 1000;
      const distance = position - operation.target;
      const movedToTarget = Math.abs(distance) <= .035 || Math.abs(position - operation.from) > .025;
      const landed = fresh && movedToTarget && !(operation.retryOnResume && snapshot.restored) &&
        distance >= -.5 && distance <= .5 + (playing ? elapsed * speed : 0);
      if (landed || time >= operation.until) {
        if (!landed && operation.retryOnResume) {
          deferredSeek = { id: operation.id, target: operation.target, position, resumeAt: 0 };
        }
        pendingSeek = undefined;
        // A target echo proves placement, but can precede decoded audio by
        // hundreds of milliseconds. Pin both clocks until the position moves.
        seekAlignment = { position, at: time, receipt: snapshot.audioReceipt, runningSince: null, outlier: undefined };
        settled = true;
      }
    }
    if (deferredSeek) {
      if (deferredSeek.id !== snapshot.id || (!snapshot.playing && snapshot.position !== deferredSeek.position)) {
        deferredSeek = undefined;
      } else if (snapshot.playing && !snapshot.loading) {
        deferredSeek.resumeAt ||= time + 240;
        if (time >= deferredSeek.resumeAt) seek(deferredSeek.target, true);
      }
    }
    return settled;
  }

  function clockPosition(time) {
    if (!clock) return 0;
    const step = clock.running ? clamp((time - clock.at) / 1000, 0, 1.1) * clock.rate : 0;
    return clamp(clock.position + step, 0, snapshot?.duration || 0);
  }

  function playbackTime(time) {
    if (drag && !drag.cancelled && drag.id === snapshot?.id && drag.changed) return drag.target;
    if (pendingSeek) return pendingSeek.target;
    return clock?.running ? Math.min(snapshot.duration, Math.max(displayed, clockPosition(time))) : clockPosition(time);
  }

  // During reacquisition a delayed packet can still describe the old side
  // of a seek. Corroborate large changes instead of applying one packet twice.
  function acceptsSeekSample(alignment, position, time, speed, paused) {
    const elapsed = clamp((time - alignment.at) / 1000, 0, 1.5);
    const delta = position - alignment.position;
    if (delta >= -.10 && delta <= .35 + elapsed * speed) {
      alignment.outlier = undefined;
      return true;
    }
    const last = alignment.outlier;
    if (!last) { alignment.outlier = { position, at: time }; return false; }
    const advance = position - last.position;
    if (advance > 0 && advance <= .35 + Math.max(0, time - last.at) / 1000 * speed) {
      alignment.outlier = undefined;
      return true;
    }
    // Also allow a genuine external jump that remains paused at a new value.
    if (paused && advance === 0 && time - last.at > 1400) {
      alignment.outlier = undefined;
      return true;
    }
    if (advance !== 0) alignment.outlier = { position, at: time };
    return false;
  }

  function updateClock(time, reset, nativeEvent = false) {
    const { position, speed, playing, loading } = snapshot;
    let running = playing && !loading;
    if (pendingSeek) return;
    if (seekAlignment) {
      const alignment = seekAlignment;
      if (alignment.runningSince !== null && time - alignment.runningSince > 1400 && !alignment.outlier) {
        seekAlignment = undefined;
      } else {
        if (!acceptsSeekSample(alignment, position, time, speed, !playing)) {
          if (!running && clock?.running) {
            alignment.runningSince = null;
            displayed = alignment.position;
            clock = { sample: displayed, position: displayed, at: time, speed, running: false, rate: speed };
          }
          return;
        }
        const freshAudio = snapshot.audioReceipt > 0 && snapshot.audioReceipt !== alignment.receipt;
        alignment.receipt = snapshot.audioReceipt;
        if (freshAudio && position === alignment.position && time - alignment.at > 160) {
          // A seek can move briefly and then buffer again. Repeated native
          // receipts at the identical position pin the clock; cached polls do not.
          alignment.runningSince = null;
        }
        if (alignment.runningSince === null) {
          running = running && position > alignment.position + .001;
          if (running) alignment.runningSince = time;
          // Awaiting motion or receiving its first sample: use the audio value
          // exactly, without carrying over pre-seek interpolation or effects.
          reset = true;
        } else if (!running) {
          alignment.runningSince = null;
          reset = true;
        }
        if (position !== alignment.position) {
          alignment.position = position;
          alignment.at = time;
        }
      }
    }
    // An unchanged cache read between native events is normal. A new event
    // confirming the same position after a stall overrides local interpolation.
    if (!seekAlignment && !reset && running && clock && position === clock.sample) {
      if (clock.audioHeld) return;
      if (clock.running && nativeEvent && time - clock.at > 160) {
        displayed = position;
        clock = { sample: position, position, at: time, speed, running: false, rate: speed, audioHeld: true };
        return;
      }
    }
    if (!reset && clock && !clock.audioHeld && position === clock.sample && speed === clock.speed && running === clock.running) return;
    const estimate = clockPosition(time);
    const discontinuity = !clock || position < clock.sample - .15 || Math.abs(position - estimate) > 1.25;
    const resumedSamples = clock && position !== clock.sample && time - clock.at >= 1100;
    if (reset || !running || !clock?.running || discontinuity || resumedSamples) {
      displayed = position;
      clock = { sample: position, position, at: time, speed, running, rate: speed };
      return;
    }
    // Ordinary late/early progress samples change the pace briefly. Restarting
    // from a slightly older sample makes a monotone fill stall until it catches up.
    const error = position - estimate;
    const correction = clamp(error / .48, -speed * .22, speed * .22);
    clock = { sample: position, position: estimate, at: time, speed, running, rate: speed + correction };
  }

  function clearSharedArt() {
    view.coverBox.classList.remove('shared-art');
    view.coverBox.style.removeProperty('background-image');
  }

  function updateCover(id, url) {
    const key = id + '|' + url;
    if (key === coverKey) return;
    coverKey = key;
    clearSharedArt();
    fluidRenderer.setCover(undefined);
    page.style.setProperty('--apple-now-playing-cover-image', url ? 'url(' + JSON.stringify(url) + ')' : 'none');
    // Replace the loading element so late events from a former URL can only
    // affect the detached image.
    const img = document.createElement('img');
    img.alt = '';
    img.hidden = true;
    img.addEventListener('load', () => {
      if (view.cover !== img || host.trackId() !== id) return;
      img.hidden = false;
      clearSharedArt();
    });
    view.cover.replaceWith(img);
    view.cover = img;
    if (url) img.src = url;
    updateBackdrop(id, url);
  }

  function paintSnapshot(previous, time) {
    const { playing, loading, liked, mode, can, duration, volume } = snapshot;
    renderMetadata();
    if (!previous || playing !== previous.playing) {
      view.play.innerHTML = icon(playing ? 'pause' : 'play');
      setButtonLabel(view.play, playing ? '暂停' : '播放');
      page.classList.toggle('is-playing', playing);
    }
    if (!previous || loading !== previous.loading) view.loading.hidden = !loading;
    if (!previous || liked !== previous.liked) {
      view.favorite.setAttribute('aria-pressed', String(liked));
      setButtonLabel(view.favorite, liked ? '取消喜欢' : '喜欢');
    }
    if (!previous || mode !== previous.mode || snapshot.modeIconMarkup !== previous.modeIconMarkup) {
      const [label, symbol] = modes[mode] || ['未知', 'order'];
      if (snapshot.modeIcon) {
        const glyph = snapshot.modeIcon.cloneNode(true);
        glyph.setAttribute('aria-hidden', 'true');
        glyph.setAttribute('focusable', 'false');
        view.mode.replaceChildren(glyph);
      } else view.mode.innerHTML = icon(symbol);
      view.mode.dataset.mode = mode;
      setButtonLabel(view.mode, '播放模式：' + label);
    }
    for (const [action, button] of view.hostButtons) {
      if (button.disabled !== !can[action]) button.disabled = !can[action];
    }
    if (!previous || previous.id !== snapshot.id || previous.can.seek !== can.seek) updateLyricTools();
    if (view.seek.disabled === can.seek) {
      view.seek.disabled = !can.seek;
      view.lyricHost.setAttribute('aria-disabled', String(!can.seek));
    }
    if (view.volume.disabled === can.volume) view.volume.disabled = !can.volume;
    if ((!drag || drag.cancelled) && Number(view.seek.max) !== (duration || 1)) view.seek.max = duration || 1;
    if (!volumeGesture && pendingVolume && pendingVolume.sent &&
        (time >= pendingVolume.until || (time >= pendingVolume.confirmAfter && Math.abs(volume - pendingVolume.target) < .004))) {
      pendingVolume = undefined;
    }
    if (!volumeGesture && !pendingVolume && volumeQueued === undefined && Math.abs(view.volume.valueAsNumber - volume) >= .005) {
      view.volume.value = volume;
    }
    fillRange(view.volume);
    if (tab === 'queue') renderQueue();
  }

  function refresh(time) {
    const previous = snapshot;
    snapshot = host.read();
    const trackChanged = !previous || previous.id !== snapshot.id;
    const sessionChanged = previous?.playId && snapshot.playId && previous.playId !== snapshot.playId;
    if (trackChanged || sessionChanged) {
      clearLyricScrollIndicator();
      hidePreview();
      closePopups();
      if (trackChanged) cancelCoverFlight();
      if (previous?.id !== snapshot.id) {
        detailRequest?.abort();
        detailRequest = undefined;
        if (details?.id !== snapshot.songId) {
          details = undefined;
          detailTrackId = undefined;
        }
        panelPositions = {};
        if (copyMode) toggleCopy(false);
      }
      if (drag && (sessionChanged || drag.id !== snapshot.id)) {
        drag.cancelled = true;
        view.seek.value = 0;
      }
      pendingSeek = deferredSeek = seekAlignment = undefined;
      ignoreFallbackPosition = previous && !snapshot.confirmedPosition ? previous.position : undefined;
    }
    if (ignoreFallbackPosition !== undefined) {
      if (snapshot.confirmedPosition || snapshot.position !== ignoreFallbackPosition) {
        ignoreFallbackPosition = undefined;
      } else {
        snapshot.position = 0;
      }
    }
    const seekSettled = settleSeek(time);
    updateClock(time, trackChanged || sessionChanged || seekSettled);
    updateCover(snapshot.id, snapshot.cover);
    paintSnapshot(previous, time);
    syncAudioAnalysis();
    if (!detailRequest && snapshot.songId && (preferences.alias !== 'hidden' || !snapshot.artistItems?.length || !snapshot.albumItem?.name)) loadDetails();
    if (snapshot.id !== lyricTrackId || restartLyrics) loadLyrics(snapshot.id);
  }

  function tick(time) {
    if (!activity) return;
    if (closing) {
      if (time >= sampleAt) {
        sampleAt = time + 32;
        if (host.trackId() !== snapshot?.id) refresh(time);
      }
      frame = requestAnimationFrame(tick);
      return;
    }
    if (dirty || time >= sampleAt) {
      dirty = false;
      sampleAt = time + (snapshot?.confirmedPosition ? 400 : 150);
      refresh(time);
    }
    const seconds = playbackTime(time);
    if ((!drag || drag.cancelled) && !pendingSeek) displayed = seconds;
    renderTime(seconds, time);
    if (previewView && !view.preview.children[1].hidden) previewView.tick(previewPosition.milliseconds, time, 0);
    paintAudioBackground(time);
    fluidRenderer.draw(time, audioPulse);
    frame = requestAnimationFrame(tick);
  }

  plugin.onLoad(() => {
    if (!document.getElementById('apple-now-playing-launch')) mount();
  });

  if (typeof plugin.onUnload === 'function') plugin.onUnload(dispose);

  async function openPluginSettingsLink(event) {
    const url = event.currentTarget.href;
    const { ncm, app } = window.betterncm || {};
    if (typeof ncm?.openUrl === 'function') {
      event.preventDefault();
      try {
        if (await ncm.openUrl(url) !== false) return;
      } catch (_) {
        // Some BetterNCM builds still need the legacy host bridge.
      }
    }
    if (typeof app?.exec !== 'function') {
      if (host.openExternal(url)) event.preventDefault();
      return;
    }
    event.preventDefault();
    try {
      await app.exec(url);
    } catch (error) {
      if (!host.openExternal(url)) console.warn('[AppleNowPlaying] 无法打开外部链接', error);
    }
  }

  function configureLyricSources(settings) {
    const orderList = settings.querySelector('[data-lyric-source-order]');
    const status = settings.querySelector('[data-lyric-source-status]');
    const showStatus = message => {
      text(status, message);
      status.hidden = !message;
    };
    function saveSources(changes, focusedId, direction) {
      const next = normalizeLyricSources({ ...lyricSourceSettings, ...changes,
        revision: Math.max(Date.now(), lyricSourceSettings.revision + 1) });
      if (!saveObject(lyricSourcesKey, next)) {
        showStatus('歌词来源设置保存失败');
        return false;
      }
      lyricSourceSettings = next;
      renderOrder(focusedId, direction);
      showStatus('已保存，刷新本曲歌词可立即应用');
      return true;
    }
    function renderOrder(focusedId, direction) {
      orderList.replaceChildren();
      const { order, custom } = lyricSourceSettings;
      order.forEach((id, index) => {
        const customSource = custom.find(source => source.id === id);
        const label = customSource ? customSource.name + '（' + customSource.format.toUpperCase() + '）' : builtInLyricSources[id].name;
        const row = document.createElement('li');
        const name = document.createElement('span');
        text(name, (index + 1) + '. ' + label);
        if (customSource?.description) name.title = customSource.description;
        const controls = document.createElement('span');
        controls.className = 'anp-source-move';
        row.append(name, controls);
        orderList.append(row);
        const moveButtons = [-1, 1].map(delta => {
          const target = index + delta;
          const caption = delta < 0 ? '上移' : '下移';
          const button = menuButton(controls, 'move-lyric-source', caption, {}, target < 0 || target >= order.length);
          button.className = 'anp-config-action';
          button.setAttribute('aria-label', caption + ' ' + label);
          button.addEventListener('click', () => {
            const reordered = [...order];
            [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
            saveSources({ order: reordered }, id, delta);
          });
          return button;
        });
        if (customSource) {
          if (customSource.website) {
            const website = document.createElement('a');
            website.className = 'anp-config-action';
            website.href = customSource.website;
            website.target = '_blank';
            website.rel = 'noopener noreferrer';
            website.setAttribute('aria-label', '访问 ' + customSource.name + ' 的网站');
            text(website, '网站');
            website.addEventListener('click', openPluginSettingsLink);
            controls.append(website);
          }
          const remove = menuButton(controls, 'remove-lyric-source', '移除');
          remove.className = 'anp-config-action';
          remove.setAttribute('aria-label', '移除 ' + customSource.name);
          remove.addEventListener('click', () => saveSources({ custom: custom.filter(source => source.id !== id),
            order: order.filter(sourceId => sourceId !== id) }));
        }
        if (focusedId === id) {
          const preferred = moveButtons[direction < 0 ? 0 : 1];
          (preferred.disabled ? moveButtons.find(button => !button.disabled) : preferred)?.focus();
        }
      });
    }
    function addSource(name, format, url, website, description = '') {
      name = name.trim();
      format = format.trim().toLowerCase();
      url = url.trim();
      website = website.trim();
      if (name.length > 60) { showStatus('歌词源名称不能超过 60 个字符'); return false; }
      if (!customLyricFormats.includes(format)) { showStatus('请选择 LRC、TTML、YRC、QRC 或 Lyricify Syllable'); return false; }
      const sample = customLyricUrl(url, { id: '1' });
      if (!sample) { showStatus('请输入包含有效歌曲占位符的 HTTPS 歌词网址'); return false; }
      const homepage = lyricSourceWebsite(website);
      if (website && !homepage) { showStatus('歌词源网站需使用有效的 HTTP 或 HTTPS 地址'); return false; }
      if (lyricSourceSettings.custom.some(source => source.format === format && source.url === url)) {
        showStatus('已添加同一网址和格式的歌词源');
        return false;
      }
      const id = 'custom-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
      return saveSources({ custom: [...lyricSourceSettings.custom, {
        id, name: name || sample.hostname, format, url, website: homepage || '', description: description.trim(),
      }],
        order: [id, ...lyricSourceSettings.order] });
    }
    const manual = settings.querySelector('[data-lyric-source-add]');
    manual.addEventListener('submit', event => {
      event.preventDefault();
      const form = new FormData(manual);
      if (addSource(form.get('sourceName'), form.get('format'), form.get('url'), form.get('website'))) manual.reset();
    });
    const fromString = settings.querySelector('[data-lyric-source-import]');
    fromString.addEventListener('submit', event => {
      event.preventDefault();
      const parts = String(new FormData(fromString).get('sourceString')).trim().split('|');
      if (parts.length !== 5) { showStatus('请输入完整的 AMLL 五段式歌词源字符串'); return; }
      let name, description;
      try {
        name = decodeURIComponent(parts[1]);
        description = decodeURIComponent(parts[2]);
      } catch (_) { showStatus('歌词源字符串的名称或简介编码无效'); return; }
      if (addSource(name, parts[3], parts[4], '', description)) fromString.reset();
    });
    renderOrder();
  }

  plugin.onConfig(() => {
    const repositoryUrl = 'https://github.com/Cellophane233/AppleNowPlaying';
    const settings = document.createElement('div');
    settings.className = 'apple-now-playing-settings';
    settings.innerHTML = `
      <h2>AppleNowPlaying 设置</h2>
      <section class="anp-config-section">
        <h3>播放页</h3>
        <label class="anp-config-card"> 
          <span class="anp-config-icon">${icon('settings')}</span>
          <span class="anp-config-copy">
            <strong>替换原生播放页</strong>
            <small>点击网易云底栏的封面时打开 AppleNowPlaying。</small>
          </span>
          <input class="anp-config-switch" type="checkbox" role="switch">
        </label>
        <section class="anp-config-card">
          <span class="anp-config-icon">${icon('screen')}</span>
          <span class="anp-config-copy">
            <strong>独立入口</strong>
            <small>关闭替换后，也可以从这里打开沉浸播放页。</small>
          </span>
          <button type="button" class="anp-config-action">打开沉浸播放页</button>
        </section>
      </section>
      <section class="anp-config-section">
        <h3>歌词</h3>
        <section class="anp-config-card">
          <span class="anp-config-icon">${icon('lyrics')}</span>
          <div class="anp-config-copy"><strong>当前曲目歌词来源：</strong><output aria-live="polite"></output></div>
          <button type="button" class="anp-config-action" data-refresh-lyrics>刷新本曲歌词</button>
          <small class="anp-config-result" role="status" hidden></small>
        </section>
        <section class="anp-config-card anp-source-config">
          <strong>歌词来源优先级</strong>
          <small>从上到下尝试，取到可用歌词后即停止。</small>
          <ol data-lyric-source-order aria-label="歌词来源优先级"></ol>
        </section>
        <section class="anp-config-card anp-source-config">
          <strong>自定义歌词来源</strong>
          <form data-lyric-source-add>
            <label>歌词源名称<input name="sourceName" maxlength="60" placeholder="选填，默认使用网址域名"></label>
            <label>歌词来源模板链接<input name="url" type="text" inputmode="url" maxlength="2048"
              placeholder="https://example.com/lyrics/[NCM_ID].ttml" required></label>
            <small>支持 [NCM_ID]、[SONG_NAME_URI]、[SONG_ARTISTS_URI] 和 [SONG_ALIAS_URI]。</small>
            <label class="anp-source-format">歌词文件格式<select name="format">${Object.entries(customLyricFormatLabels)
              .map(([format, label]) => `<option value="${format}">${label}</option>`).join('')}</select></label>
            <label>歌词源网站<input name="website" type="url" maxlength="2048" placeholder="选填"></label>
            <button type="submit" class="anp-config-action">添加歌词来源</button>
          </form>
          <form data-lyric-source-import>
            <label class="anp-source-url">AMLL 歌词源字符串<input name="sourceString" maxlength="4096" required></label>
            <button type="submit" class="anp-config-action">从歌词源字符串添加</button>
          </form>
          <small data-lyric-source-status role="status" hidden></small>
        </section>
        <section class="anp-config-card">
          <span class="anp-config-icon">${icon('music')}</span>
          <span class="anp-config-copy">
            <strong>AMLL 社区歌词库</strong>
            <small>目前部分歌曲的歌词资源仍存在缺失、时间轴不准确或动态效果不佳等问题，欢迎大家参与歌词库共建，一起完善歌词资源，提升播放体验！</small>
          </span>
          <a class="anp-config-action" href="https://github.com/amll-dev/amll-ttml-db" target="_blank" rel="noopener noreferrer">查看歌词库</a>
        </section>
      </section>
      <section class="anp-config-section">
        <h3>项目</h3>
        <div class="anp-config-card">
          <span class="anp-config-icon">${icon('more')}</span>
          <span class="anp-config-copy"><strong>AppleNowPlaying</strong></span>
          <a class="anp-config-action" href="${repositoryUrl}" target="_blank" rel="noopener noreferrer">源代码</a>
          <a class="anp-config-action" href="${repositoryUrl}/issues" target="_blank" rel="noopener noreferrer">问题反馈</a>
        </div>
      </section>`;
    const toggle = settings.querySelector('input');
    toggle.checked = takeover;
    toggle.addEventListener('change', () => {
      takeover = toggle.checked;
      localStorage.setItem(takeoverKey, takeover ? 'on' : 'off');
      updateLauncher();
      dirty = true;
      metadataSignature = '';
    });
    lyricSettings = { source: settings.querySelector('output'), button: settings.querySelector('[data-refresh-lyrics]'),
      result: settings.querySelector('.anp-config-result') };
    lyricSettings.button.addEventListener('click', refreshCurrentLyrics);
    refreshSettingsSource();
    const entry = settings.querySelector('button');
    entry.addEventListener('click', () => open(entry));
    for (const reference of settings.querySelectorAll('a')) {
      reference.addEventListener('click', openPluginSettingsLink);
    }
    configureLyricSources(settings);
    return settings;
  });
})();
