import { CSVParser, DateParser, ScheduleParser } from '../csv-import';

describe('CSVParser', () => {
  describe('parseCSV', () => {
    it('should parse simple CSV content', () => {
      const csvContent = 'Name,Age,City\nJohn,25,New York\nJane,30,Boston';
      const result = CSVParser.parseCSV(csvContent);
      
      expect(result).toEqual([
        ['Name', 'Age', 'City'],
        ['John', '25', 'New York'],
        ['Jane', '30', 'Boston']
      ]);
    });

    it('should handle quoted fields with commas', () => {
      const csvContent = 'Name,Description\n"Smith, John","A person with, commas"';
      const result = CSVParser.parseCSV(csvContent);
      
      expect(result).toEqual([
        ['Name', 'Description'],
        ['Smith, John', 'A person with, commas']
      ]);
    });

    it('should handle escaped quotes', () => {
      const csvContent = 'Name,Quote\nJohn,"He said ""Hello"""';
      const result = CSVParser.parseCSV(csvContent);
      
      expect(result).toEqual([
        ['Name', 'Quote'],
        ['John', 'He said "Hello"']
      ]);
    });
  });

  describe('rowsToObjects', () => {
    it('should convert rows to objects using headers', () => {
      const rows = [
        ['Name', 'Age', 'City'],
        ['John', '25', 'New York'],
        ['Jane', '30', 'Boston']
      ];
      
      const result = CSVParser.rowsToObjects(rows);
      
      expect(result).toEqual([
        { Name: 'John', Age: '25', City: 'New York' },
        { Name: 'Jane', Age: '30', City: 'Boston' }
      ]);
    });

    it('should handle empty rows', () => {
      const rows: string[][] = [];
      const result = CSVParser.rowsToObjects(rows);
      expect(result).toEqual([]);
    });
  });
});

describe('DateParser', () => {
  describe('parseDate', () => {
    it('should parse MM/DD/YY format', () => {
      const result = DateParser.parseDate('8/28/25');
      expect(result).toEqual(new Date(2025, 7, 28)); // Month is 0-indexed
    });

    it('should parse MM/DD/YYYY format', () => {
      const result = DateParser.parseDate('8/28/2025');
      expect(result).toEqual(new Date(2025, 7, 28));
    });

    it('should handle estimated dates', () => {
      const result = DateParser.parseDate('est 4/25');
      expect(result).toEqual(new Date(2025, 3, 15)); // 15th of April 2025
    });

    it('should return null for invalid dates', () => {
      expect(DateParser.parseDate('N/A')).toBeNull();
      expect(DateParser.parseDate('')).toBeNull();
      expect(DateParser.parseDate('#VALUE!')).toBeNull();
    });

    it('should handle "DUE" status', () => {
      const result = DateParser.parseDate('DUE');
      expect(result).toBeInstanceOf(Date);
      // Should be close to current date
      const now = new Date();
      const diff = Math.abs(result!.getTime() - now.getTime());
      expect(diff).toBeLessThan(1000); // Within 1 second
    });

    it('should parse year-only format', () => {
      const result = DateParser.parseDate('2024');
      expect(result).toEqual(new Date(2024, 0, 1)); // January 1st, 2024
    });
  });
});

describe('ScheduleParser', () => {
  describe('parseSchedule', () => {
    it('should normalize schedule strings', () => {
      expect(ScheduleParser.parseSchedule('every 4 weeks')).toBe('every 4 weeks');
      expect(ScheduleParser.parseSchedule('Every 4-6 Weeks')).toBe('every 4-6 weeks');
      expect(ScheduleParser.parseSchedule('EVERY 2-3 WEEKS')).toBe('every 2-3 weeks');
    });

    it('should handle empty or invalid schedules', () => {
      expect(ScheduleParser.parseSchedule('')).toBe('');
      expect(ScheduleParser.parseSchedule('N/A')).toBe('');
      expect(ScheduleParser.parseSchedule('invalid schedule')).toBe('invalid schedule');
    });
  });

  describe('calculateNextDue', () => {
    it('should calculate next due date for simple schedule', () => {
      const lastFertilized = new Date(2025, 0, 1); // January 1, 2025
      const schedule = 'every 4 weeks';
      
      const result = ScheduleParser.calculateNextDue(lastFertilized, schedule);
      const expected = new Date(2025, 0, 29); // January 29, 2025 (28 days later)
      
      expect(result).toEqual(expected);
    });

    it('should calculate next due date for range schedule', () => {
      const lastFertilized = new Date(2025, 0, 1);
      const schedule = 'every 4-6 weeks';
      
      const result = ScheduleParser.calculateNextDue(lastFertilized, schedule);
      const expected = new Date(2025, 1, 5); // February 5, 2025 (35 days later, middle of 4-6 weeks)
      
      expect(result).toEqual(expected);
    });

    it('should return null for invalid inputs', () => {
      expect(ScheduleParser.calculateNextDue(null, 'every 4 weeks')).toBeNull();
      expect(ScheduleParser.calculateNextDue(new Date(), '')).toBeNull();
      expect(ScheduleParser.calculateNextDue(new Date(), 'invalid')).toBeNull();
    });
  });
});