import * as fs from 'fs';
import * as path from 'path';
import { ProgramData } from './src/types/programs';

// Function to parse CSV and convert to ProgramData array
function parseCSV(csvContent: string): ProgramData[] {
  const lines = csvContent.trim().split('\n');
  const programs: ProgramData[] = [];

  // Skip header line (line 0)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    
    // Parse CSV line considering commas within quotes
    const fields = parseCSVLine(line);
    
    if (fields.length >= 5) {
      const [genre, programCode, programName, textColor, backgroundColor] = fields;
      
      // Clean up color values - extract RGB values from CSS format
      const cleanTextColor = extractRGBColor(textColor);
      const cleanBackgroundColor = extractRGBColor(backgroundColor);
      
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
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(currentField);
      currentField = '';
    } else {
      currentField += char;
    }
  }
  
  // Add the last field
  fields.push(currentField);
  
  return fields;
}

// Helper function to extract RGB color from CSS format
function extractRGBColor(cssColor: string): string | null {
  const match = cssColor.match(/rgb\((\d+,\s*\d+,\s*\d+)\)/);
  return match ? `rgb(${match[1]})` : null;
}

async function testCSVParsing() {
  console.log('📂 Testing CSV parsing...');
  
  try {
    // Read CSV file
    const csvFilePath = path.join(__dirname, '..', 'sample', 'FEELCYCLE Program.csv');
    console.log(`Reading CSV file: ${csvFilePath}`);
    
    const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
    
    // Parse CSV
    const programs = parseCSV(csvContent);
    console.log(`📊 Parsed ${programs.length} programs from CSV`);
    
    // Show sample data
    console.log('\n📝 Sample programs:');
    programs.slice(0, 10).forEach((program, index) => {
      console.log(`${index + 1}. ${program.programName} (${program.programCode})`);
      console.log(`   Genre: ${program.genre}`);
      console.log(`   Colors: ${program.backgroundColor} / ${program.textColor}`);
      console.log('');
    });
    
    // Show program codes summary
    const programCodeCounts = programs.reduce((acc, program) => {
      acc[program.programCode] = (acc[program.programCode] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('📈 Program codes summary:');
    Object.entries(programCodeCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([code, count]) => {
        console.log(`   ${code}: ${count} programs`);
      });
    
    // Show unique colors for each program code
    console.log('\n🎨 Colors by program code:');
    const uniqueProgramCodes = Array.from(new Set(programs.map(p => p.programCode)));
    uniqueProgramCodes.sort().forEach(code => {
      const programsForCode = programs.filter(p => p.programCode === code);
      if (programsForCode.length > 0) {
        const sample = programsForCode[0];
        console.log(`   ${code}: ${sample.backgroundColor} / ${sample.textColor}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to parse CSV:', error);
    throw error;
  }
}

// Run the test
testCSVParsing().then(() => {
  console.log('🏁 CSV parsing test completed successfully');
  process.exit(0);
}).catch(error => {
  console.error('💥 CSV parsing test failed:', error);
  process.exit(1);
});