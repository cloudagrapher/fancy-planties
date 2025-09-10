import { z } from 'zod';

// CSV parsing utilities
export class CSVParser {
  /**
   * Parse CSV content into rows of data
   */
  static parseCSV(csvContent: string): string[][] {
    const lines = csvContent.trim().split('\n');
    const result: string[][] = [];
    
    for (const line of lines) {
      const row = this.parseCSVLine(line);
      result.push(row);
    }
    
    return result;
  }

  /**
   * Parse a single CSV line handling quoted fields and commas
   */
  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        result.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }

    // Add the last field
    result.push(current.trim());
    return result;
  }

  /**
   * Convert parsed CSV rows to objects using headers
   */
  static rowsToObjects<T>(rows: string[][], headerMapping?: Record<string, string>): Record<string, string>[] {
    if (rows.length === 0) return [];
    
    const headers = rows[0].map(header => {
      const trimmed = header.trim();
      return headerMapping?.[trimmed] || trimmed;
    });
    
    return rows.slice(1).map(row => {
      const obj: Record<string, string> = {};
      headers.forEach((header, index) => {
        obj[header] = row[index]?.trim() || '';
      });
      return obj;
    });
  }
}

// Date parsing utilities for CSV imports
export class DateParser {
  /**
   * Parse various date formats found in CSV files
   */
  static parseDate(dateStr: string): Date | null {
    if (!dateStr || dateStr.trim() === '' || dateStr === 'N/A') {
      return null;
    }

    const trimmed = dateStr.trim();
    
    // Handle "est MM/YY" format
    if (trimmed.startsWith('est ')) {
      const datepart = trimmed.substring(4);
      return this.parseEstimatedDate(datepart);
    }

    // Handle "DUE" status
    if (trimmed === 'DUE') {
      return new Date(); // Current date for overdue items
    }

    // Handle "#VALUE!" Excel error
    if (trimmed === '#VALUE!') {
      return null;
    }

    // Try standard date formats
    const formats = [
      /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/, // MM/DD/YY or MM/DD/YYYY
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
      /^(\d{1,2})-(\d{1,2})-(\d{2,4})$/, // MM-DD-YY or MM-DD-YYYY
    ];

    for (const format of formats) {
      const match = trimmed.match(format);
      if (match) {
        return this.createDateFromMatch(match, format);
      }
    }

    // Try parsing as a year only (for propagations)
    if (/^\d{4}$/.test(trimmed)) {
      const year = parseInt(trimmed, 10);
      return new Date(year, 0, 1); // January 1st of that year
    }

    // Fallback to Date constructor
    const parsed = new Date(trimmed);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  private static parseEstimatedDate(dateStr: string): Date | null {
    // Handle MM/YY format (like "4/25")
    const monthYearMatch = dateStr.match(/^(\d{1,2})\/(\d{2,4})$/);
    if (monthYearMatch) {
      const month = parseInt(monthYearMatch[1], 10) - 1; // Month is 0-indexed
      let year = parseInt(monthYearMatch[2], 10);
      
      // Handle 2-digit years
      if (year < 100) {
        year += year < 50 ? 2000 : 1900;
      }
      
      return new Date(year, month, 15); // Use 15th of the month for estimates
    }

    // Handle MM/DD/YY format even with "est" prefix
    const fullDateMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (fullDateMatch) {
      const month = parseInt(fullDateMatch[1], 10) - 1;
      const day = parseInt(fullDateMatch[2], 10);
      let year = parseInt(fullDateMatch[3], 10);
      
      // Handle 2-digit years
      if (year < 100) {
        year += year < 50 ? 2000 : 1900;
      }
      
      return new Date(year, month, day);
    }

    return null;
  }

  private static createDateFromMatch(match: RegExpMatchArray, format: RegExp): Date | null {
    if (format.source.includes('(\\d{4})')) {
      // YYYY-MM-DD format
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      return new Date(year, month, day);
    } else {
      // MM/DD/YY or MM-DD-YY format
      const month = parseInt(match[1], 10) - 1;
      const day = parseInt(match[2], 10);
      let year = parseInt(match[3], 10);
      
      // Handle 2-digit years
      if (year < 100) {
        year += year < 50 ? 2000 : 1900;
      }
      
      return new Date(year, month, day);
    }
  }
}

// Schedule parsing utilities
export class ScheduleParser {
  /**
   * Parse fertilizer schedule strings into standardized format
   */
  static parseSchedule(scheduleStr: string): string {
    if (!scheduleStr || scheduleStr.trim() === '' || scheduleStr === 'N/A') {
      return '';
    }

    const trimmed = scheduleStr.trim().toLowerCase();
    
    // Normalize common schedule formats
    const scheduleMap: Record<string, string> = {
      'every 2 weeks': 'every 2 weeks',
      'every 2-3 weeks': 'every 2-3 weeks',
      'every 2-4 weeks': 'every 2-4 weeks',
      'every 3-4 weeks': 'every 3-4 weeks',
      'every 4 weeks': 'every 4 weeks',
      'every 4-6 weeks': 'every 4-6 weeks',
      'every 6-8 weeks': 'every 6-8 weeks',
      'every 17 weeks': 'every 17 weeks',
    };

    return scheduleMap[trimmed] || scheduleStr;
  }

  /**
   * Calculate next due date based on last fertilized date and schedule
   */
  static calculateNextDue(lastFertilized: Date | null, schedule: string): Date | null {
    if (!lastFertilized || !schedule) {
      return null;
    }

    const weeks = this.extractWeeksFromSchedule(schedule);
    if (weeks === null) {
      return null;
    }

    const nextDue = new Date(lastFertilized);
    nextDue.setDate(nextDue.getDate() + (weeks * 7));
    return nextDue;
  }

  private static extractWeeksFromSchedule(schedule: string): number | null {
    const trimmed = schedule.toLowerCase();
    
    // Extract number of weeks from schedule string
    const patterns = [
      /every (\d+) weeks?/,
      /every (\d+)-(\d+) weeks?/,
    ];

    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match) {
        if (match[2]) {
          // Range like "4-6 weeks" - use the middle value
          const min = parseInt(match[1], 10);
          const max = parseInt(match[2], 10);
          return Math.round((min + max) / 2);
        } else {
          // Single value like "4 weeks"
          return parseInt(match[1], 10);
        }
      }
    }

    return null;
  }
}