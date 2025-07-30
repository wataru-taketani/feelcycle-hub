// FEELCYCLE Program data types and interfaces

export interface ProgramData {
  programCode: string;       // "BB1", "BB2", "BSL", etc. (Primary Key - more logical)
  programName: string;       // "BB1 BRIT 2024", "BB2 HOUSE 1", etc.
  genre: string;            // "HOUSE", "GREATEST HITS", "ARTIST", "EVENT", etc.
  backgroundColor: string;   // "rgb(255, 255, 102)"
  textColor: string;        // "rgb(0, 0, 0)"
}

