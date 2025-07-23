"use strict";
// Common types for FEELCYCLE Hub
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeStudioCode = void 0;
/**
 * Normalize studio code to lowercase for consistent data storage and querying
 */
const normalizeStudioCode = (studioCode) => {
    return studioCode.toLowerCase();
};
exports.normalizeStudioCode = normalizeStudioCode;
