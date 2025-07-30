"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
// Function to parse CSV and convert to ProgramData array
function parseCSV(csvContent) {
    var lines = csvContent.trim().split('\n');
    var programs = [];
    // Skip header line (line 0)
    for (var i = 1; i < lines.length; i++) {
        var line = lines[i];
        // Parse CSV line considering commas within quotes
        var fields = parseCSVLine(line);
        if (fields.length >= 5) {
            var genre = fields[0], programCode = fields[1], programName = fields[2], textColor = fields[3], backgroundColor = fields[4];
            // Clean up color values - extract RGB values from CSS format
            var cleanTextColor = extractRGBColor(textColor);
            var cleanBackgroundColor = extractRGBColor(backgroundColor);
            if (cleanTextColor && cleanBackgroundColor) {
                programs.push({
                    programName: programName.trim(),
                    programCode: programCode.trim(),
                    genre: genre.trim(),
                    backgroundColor: cleanBackgroundColor,
                    textColor: cleanTextColor
                });
            }
        }
    }
    return programs;
}
// Helper function to parse CSV line considering quoted fields
function parseCSVLine(line) {
    var fields = [];
    var currentField = '';
    var inQuotes = false;
    for (var i = 0; i < line.length; i++) {
        var char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        }
        else if (char === ',' && !inQuotes) {
            fields.push(currentField);
            currentField = '';
        }
        else {
            currentField += char;
        }
    }
    // Add the last field
    fields.push(currentField);
    return fields;
}
// Helper function to extract RGB color from CSS format
function extractRGBColor(cssColor) {
    var match = cssColor.match(/rgb\((\d+,\s*\d+,\s*\d+)\)/);
    return match ? "rgb(".concat(match[1], ")") : null;
}
function testCSVParsing() {
    return __awaiter(this, void 0, void 0, function () {
        var csvFilePath, csvContent, programs_1, programCodeCounts, uniqueProgramCodes;
        return __generator(this, function (_a) {
            console.log('📂 Testing CSV parsing...');
            try {
                csvFilePath = path.join(__dirname, '..', 'sample', 'FEELCYCLE Program.csv');
                console.log("Reading CSV file: ".concat(csvFilePath));
                csvContent = fs.readFileSync(csvFilePath, 'utf-8');
                programs_1 = parseCSV(csvContent);
                console.log("\uD83D\uDCCA Parsed ".concat(programs_1.length, " programs from CSV"));
                // Show sample data
                console.log('\n📝 Sample programs:');
                programs_1.slice(0, 10).forEach(function (program, index) {
                    console.log("".concat(index + 1, ". ").concat(program.programName, " (").concat(program.programCode, ")"));
                    console.log("   Genre: ".concat(program.genre));
                    console.log("   Colors: ".concat(program.backgroundColor, " / ").concat(program.textColor));
                    console.log('');
                });
                programCodeCounts = programs_1.reduce(function (acc, program) {
                    acc[program.programCode] = (acc[program.programCode] || 0) + 1;
                    return acc;
                }, {});
                console.log('📈 Program codes summary:');
                Object.entries(programCodeCounts)
                    .sort(function (_a, _b) {
                    var a = _a[1];
                    var b = _b[1];
                    return b - a;
                })
                    .forEach(function (_a) {
                    var code = _a[0], count = _a[1];
                    console.log("   ".concat(code, ": ").concat(count, " programs"));
                });
                // Show unique colors for each program code
                console.log('\n🎨 Colors by program code:');
                uniqueProgramCodes = Array.from(new Set(programs_1.map(function (p) { return p.programCode; })));
                uniqueProgramCodes.sort().forEach(function (code) {
                    var programsForCode = programs_1.filter(function (p) { return p.programCode === code; });
                    if (programsForCode.length > 0) {
                        var sample = programsForCode[0];
                        console.log("   ".concat(code, ": ").concat(sample.backgroundColor, " / ").concat(sample.textColor));
                    }
                });
            }
            catch (error) {
                console.error('❌ Failed to parse CSV:', error);
                throw error;
            }
            return [2 /*return*/];
        });
    });
}
// Run the test
testCSVParsing().then(function () {
    console.log('🏁 CSV parsing test completed successfully');
    process.exit(0);
}).catch(function (error) {
    console.error('💥 CSV parsing test failed:', error);
    process.exit(1);
});
