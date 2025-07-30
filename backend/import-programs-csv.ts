import * as fs from 'fs';
import * as path from 'path';
import { ProgramsService } from './src/services/programs-service';
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
          programCode: programCode.trim(),
          programName: programName.trim(),
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

async function importProgramsFromCSV() {
  console.log('📂 Importing FEELCYCLE programs from CSV...');
  
  // Set environment variables for local testing
  process.env.PROGRAMS_TABLE_NAME = 'feelcycle-hub-programs-dev';
  process.env.AWS_REGION = 'ap-northeast-1';
  
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
    programs.slice(0, 5).forEach((program, index) => {
      console.log(`${index + 1}. ${program.programName} (${program.programCode})`);
      console.log(`   Genre: ${program.genre}`);
      console.log(`   Colors: ${program.backgroundColor} / ${program.textColor}`);
    });
    
    // Save to DynamoDB
    console.log('\n💾 Saving to DynamoDB...');
    const programsService = new ProgramsService();
    await programsService.storeProgramsData(programs);
    
    console.log(`✅ Successfully imported ${programs.length} programs to DynamoDB`);
    
    // Verify data
    console.log('\n🔍 Verifying imported data...');
    const importedPrograms = await programsService.getAllPrograms();
    console.log(`📊 Found ${importedPrograms.length} programs in database`);
    
    // Show program codes summary
    const programCodeCounts = importedPrograms.reduce((acc, program) => {
      acc[program.programCode] = (acc[program.programCode] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n📈 Program codes summary:');
    Object.entries(programCodeCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([code, count]) => {
        console.log(`   ${code}: ${count} programs`);
      });
    
  } catch (error) {
    console.error('❌ Failed to import programs:', error);
    throw error;
  }
}

// Run the import
importProgramsFromCSV().then(() => {
  console.log('🏁 Import completed successfully');
  process.exit(0);
}).catch(error => {
  console.error('💥 Import failed:', error);
  process.exit(1);
});