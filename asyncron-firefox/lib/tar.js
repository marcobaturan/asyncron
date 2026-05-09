/**
 * lib/tar.js
 * A lightweight, dependency-free implementation of the ustar tar format.
 * Supports creating and extracting uncompressed tar archives.
 */

export class TarBuilder {
  constructor() {
    this.buffers = [];
    this.written = 0;
  }

  // Helper to format header fields
  _padNumber(num, length) {
    let str = num.toString(8);
    while (str.length < length - 1) str = "0" + str;
    return str + " \0";
  }

  _writeString(buffer, offset, str, length) {
    for (let i = 0; i < length; i++) {
      buffer[offset + i] = i < str.length ? str.charCodeAt(i) & 0xff : 0;
    }
  }

  /**
   * Adds a file to the archive.
   * @param {string} name - File path
   * @param {Uint8Array|string} content - File content
   */
  addFile(name, content) {
    if (typeof content === "string") {
      content = new TextEncoder().encode(content);
    }
    
    // Prevent path traversal
    if (name.includes("..")) {
      throw new Error("Path traversal is not allowed: " + name);
    }

    const header = new Uint8Array(512);
    
    this._writeString(header, 0, name, 100); // name
    this._writeString(header, 100, "0000777", 8); // mode
    this._writeString(header, 108, "0000000", 8); // uid
    this._writeString(header, 116, "0000000", 8); // gid
    
    // size (12 bytes octal)
    let sizeStr = content.length.toString(8);
    while (sizeStr.length < 11) sizeStr = "0" + sizeStr;
    this._writeString(header, 124, sizeStr + " ", 12);
    
    // mtime
    const mtime = Math.floor(Date.now() / 1000).toString(8);
    let mtimeStr = mtime;
    while (mtimeStr.length < 11) mtimeStr = "0" + mtimeStr;
    this._writeString(header, 136, mtimeStr + " ", 12);
    
    this._writeString(header, 156, "0", 1); // typeflag (0 = regular file)
    this._writeString(header, 257, "ustar  \0", 8); // magic & version
    
    // checksum
    // The checksum field is initially filled with spaces (8 spaces)
    for (let i = 0; i < 8; i++) {
      header[148 + i] = 32;
    }
    let checksum = 0;
    for (let i = 0; i < 512; i++) {
      checksum += header[i];
    }
    let checksumStr = checksum.toString(8);
    while (checksumStr.length < 6) checksumStr = "0" + checksumStr;
    this._writeString(header, 148, checksumStr + "\0 ", 8);

    this.buffers.push(header);
    this.buffers.push(content);
    
    // Pad content to 512 bytes
    const paddingLength = (512 - (content.length % 512)) % 512;
    if (paddingLength > 0) {
      this.buffers.push(new Uint8Array(paddingLength));
    }
  }

  /**
   * Builds the final tar archive as a Blob.
   * @returns {Blob}
   */
  build() {
    // End of archive is marked by two 512-byte blocks of null bytes
    this.buffers.push(new Uint8Array(1024));
    // In node, we might want to return Uint8Array or Buffer, but spec requires JS for browser.
    // In unit tests, we'll polyfill Blob if missing.
    if (typeof Blob !== "undefined") {
      return new Blob(this.buffers, { type: "application/x-tar" });
    }
    // Fallback for tests
    return this.buffers;
  }
}

export class TarReader {
  /**
   * Reads a tar archive from an ArrayBuffer or Uint8Array.
   * @param {ArrayBuffer|Uint8Array} buffer - The tar archive buffer
   * @returns {Array<{name: string, size: number, data: Uint8Array}>}
   */
  static read(buffer) {
    const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let offset = 0;
    const files = [];

    const decoder = new TextDecoder("utf-8");

    while (offset < data.length - 512) {
      const header = data.subarray(offset, offset + 512);
      
      // Check for end of archive (empty block)
      let isEmpty = true;
      for (let i = 0; i < 512; i++) {
        if (header[i] !== 0) {
          isEmpty = false;
          break;
        }
      }
      if (isEmpty) break;

      // Extract name (null-terminated string)
      let nameEnd = 0;
      while (nameEnd < 100 && header[nameEnd] !== 0) nameEnd++;
      const name = decoder.decode(header.subarray(0, nameEnd));

      // Extract size (octal)
      let sizeEnd = 124;
      while (sizeEnd < 136 && header[sizeEnd] !== 0 && header[sizeEnd] !== 32) sizeEnd++;
      const sizeStr = decoder.decode(header.subarray(124, sizeEnd)).trim();
      const size = parseInt(sizeStr, 8);

      offset += 512;
      
      // Prevent path traversal
      if (name.includes("..")) {
        throw new Error("Invalid tar file: path traversal detected -> " + name);
      }

      if (size > 0) {
        const fileData = data.subarray(offset, offset + size);
        files.push({ name, size, data: fileData });
      } else {
        files.push({ name, size, data: new Uint8Array(0) });
      }

      // Move to next block (aligned to 512 bytes)
      offset += size;
      const padding = (512 - (size % 512)) % 512;
      offset += padding;
    }

    return files;
  }
}
