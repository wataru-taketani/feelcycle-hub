/**
 * 型システムテスト
 * Phase 4.2: 型安全性強化
 */

import { 
  isString, 
  isNumber, 
  isEmail, 
  isStudioCode,
  isDifficultyLevel,
  combineValidators,
  validateObject,
  createSchemaValidator,
  userPreferencesSchema,
  lessonSchema,
  required,
  minLength,
  maxLength,
  min,
  max
} from '../utils/validation';

import type { 
  StrictValidationError,
  ValidationFunction 
} from '../types/global';

describe('Type System Tests', () => {
  describe('Type Guards', () => {
    test('isString should correctly identify strings', () => {
      expect(isString('hello')).toBe(true);
      expect(isString('')).toBe(true);
      expect(isString(123)).toBe(false);
      expect(isString(null)).toBe(false);
      expect(isString(undefined)).toBe(false);
      expect(isString({})).toBe(false);
      expect(isString([])).toBe(false);
    });

    test('isNumber should correctly identify numbers', () => {
      expect(isNumber(123)).toBe(true);
      expect(isNumber(0)).toBe(true);
      expect(isNumber(-456)).toBe(true);
      expect(isNumber(3.14)).toBe(true);
      expect(isNumber(NaN)).toBe(false);
      expect(isNumber(Infinity)).toBe(false);
      expect(isNumber('123')).toBe(false);
      expect(isNumber(null)).toBe(false);
    });

    test('isEmail should validate email addresses', () => {
      expect(isEmail('user@example.com')).toBe(true);
      expect(isEmail('test.email+tag@domain.co.jp')).toBe(true);
      expect(isEmail('invalid.email')).toBe(false);
      expect(isEmail('@domain.com')).toBe(false);
      expect(isEmail('user@')).toBe(false);
      expect(isEmail('')).toBe(false);
      expect(isEmail('not an email')).toBe(false);
    });

    test('isStudioCode should validate FEELCYCLE studio codes', () => {
      expect(isStudioCode('SH')).toBe(true);     // 新宿
      expect(isStudioCode('SHB')).toBe(true);    // 渋谷
      expect(isStudioCode('GNZ')).toBe(true);    // 銀座
      expect(isStudioCode('ROPG')).toBe(true);   // 六本木
      expect(isStudioCode('sh')).toBe(false);    // 小文字は無効
      expect(isStudioCode('S')).toBe(false);     // 1文字は無効
      expect(isStudioCode('TOOLONG')).toBe(false); // 5文字以上は無効
      expect(isStudioCode('12')).toBe(false);    // 数字は無効
      expect(isStudioCode('')).toBe(false);
    });

    test('isDifficultyLevel should validate difficulty levels', () => {
      expect(isDifficultyLevel(1)).toBe(true);
      expect(isDifficultyLevel(3)).toBe(true);
      expect(isDifficultyLevel(5)).toBe(true);
      expect(isDifficultyLevel(0)).toBe(false);
      expect(isDifficultyLevel(6)).toBe(false);
      expect(isDifficultyLevel(3.5)).toBe(false);  // 小数は無効
      expect(isDifficultyLevel(-1)).toBe(false);
      expect(isDifficultyLevel('3')).toBe(false);  // 文字列は無効
    });
  });

  describe('Basic Validators', () => {
    test('required validator', () => {
      const validator = required('This field is required');
      
      expect(validator('test')).toBeUndefined();
      expect(validator(123)).toBeUndefined();
      expect(validator(false)).toBeUndefined();  // false は有効な値
      
      expect(validator('')).toBe('This field is required');
      expect(validator(null)).toBe('This field is required');
      expect(validator(undefined)).toBe('This field is required');
    });

    test('minLength validator', () => {
      const validator = minLength(3);
      
      expect(validator('abc')).toBeUndefined();
      expect(validator('abcd')).toBeUndefined();
      expect(validator('ab')).toBe('Minimum length is 3 characters');
      expect(validator('')).toBe('Minimum length is 3 characters');
    });

    test('maxLength validator', () => {
      const validator = maxLength(5);
      
      expect(validator('abc')).toBeUndefined();
      expect(validator('abcde')).toBeUndefined();
      expect(validator('abcdef')).toBe('Maximum length is 5 characters');
    });

    test('min and max number validators', () => {
      const minValidator = min(10);
      const maxValidator = max(100);
      
      expect(minValidator(10)).toBeUndefined();
      expect(minValidator(50)).toBeUndefined();
      expect(minValidator(9)).toBe('Minimum value is 10');
      
      expect(maxValidator(100)).toBeUndefined();
      expect(maxValidator(50)).toBeUndefined();
      expect(maxValidator(101)).toBe('Maximum value is 100');
    });
  });

  describe('Combined Validators', () => {
    test('combineValidators should run all validators', () => {
      const validator = combineValidators<string>(
        required('Required'),
        minLength(3, 'Too short'),
        maxLength(10, 'Too long')
      );
      
      expect(validator('hello')).toBeUndefined();
      expect(validator('')).toBe('Required');
      expect(validator('ab')).toBe('Too short');
      expect(validator('this is too long')).toBe('Too long');
    });
  });

  describe('Object Validation', () => {
    test('validateObject should validate multiple fields', () => {
      const validators = {
        name: combineValidators(required(), minLength(2)),
        age: combineValidators(required(), min(0)),
        email: (value: unknown) => {
          if (!isEmail(value)) return 'Invalid email format';
          return undefined;
        }
      };

      const validData = {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com'
      };

      const invalidData = {
        name: 'J',
        age: -5,
        email: 'invalid-email'
      };

      const validErrors = validateObject(validData, validators);
      const invalidErrors = validateObject(invalidData, validators);

      expect(validErrors).toHaveLength(0);
      expect(invalidErrors).toHaveLength(3);
      expect(invalidErrors[0].field).toBe('name');
      expect(invalidErrors[1].field).toBe('age');
      expect(invalidErrors[2].field).toBe('email');
    });
  });

  describe('Schema Validation', () => {
    test('user preferences schema validation', () => {
      const validator = createSchemaValidator(userPreferencesSchema);

      // Valid data
      const validData = {
        favoriteStudios: ['SH', 'SHB'],
        favoriteInstructors: ['Instructor A'],
        notificationTiming: 30
      };

      const validResult = validator(validData);
      expect(validResult.isValid).toBe(true);
      expect(validResult.data).toEqual(validData);
      expect(validResult.errors).toHaveLength(0);

      // Invalid data - missing required field
      const invalidData1 = {
        favoriteStudios: ['SH'],
        favoriteInstructors: ['Instructor A']
        // notificationTiming is missing but required
      };

      const invalidResult1 = validator(invalidData1);
      expect(invalidResult1.isValid).toBe(false);
      expect(invalidResult1.errors).toHaveLength(1);
      expect(invalidResult1.errors[0].code).toBe('REQUIRED');

      // Invalid data - invalid notification timing
      const invalidData2 = {
        favoriteStudios: ['SH'],
        favoriteInstructors: ['Instructor A'],
        notificationTiming: 2000 // exceeds max value
      };

      const invalidResult2 = validator(invalidData2);
      expect(invalidResult2.isValid).toBe(false);
      expect(invalidResult2.errors).toHaveLength(1);
      expect(invalidResult2.errors[0].code).toBe('VALIDATION_ERROR');
    });

    test('lesson schema validation', () => {
      const validator = createSchemaValidator(lessonSchema);

      // Valid data
      const validData = {
        studioCode: 'SH',
        programName: 'BB1',
        instructorName: 'Instructor Name',
        difficulty: 3,
        startTime: '2023-12-01T10:00:00.000Z'
      };

      const validResult = validator(validData);
      expect(validResult.isValid).toBe(true);
      expect(validResult.data).toEqual(validData);

      // Invalid studio code
      const invalidData = {
        studioCode: 'invalid',
        programName: 'BB1',
        instructorName: 'Instructor Name',
        difficulty: 3,
        startTime: '2023-12-01T10:00:00.000Z'
      };

      const invalidResult = validator(invalidData);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors[0].field).toBe('studioCode');
      expect(invalidResult.errors[0].code).toBe('TYPE_ERROR');
    });
  });

  describe('Type Safety Edge Cases', () => {
    test('should handle undefined and null correctly', () => {
      const validator = createSchemaValidator({
        optionalField: {
          required: false,
          type: isString
        },
        requiredField: {
          required: true,
          type: isString
        }
      });

      // Test with undefined optional field
      const result1 = validator({
        requiredField: 'test'
      });
      expect(result1.isValid).toBe(true);

      // Test with null optional field
      const result2 = validator({
        optionalField: null,
        requiredField: 'test'
      });
      expect(result2.isValid).toBe(true);

      // Test with missing required field
      const result3 = validator({
        optionalField: 'optional'
      });
      expect(result3.isValid).toBe(false);
      expect(result3.errors[0].field).toBe('requiredField');
    });

    test('should handle array index access safely', () => {
      const testArray: (string | undefined)[] = ['a', 'b', 'c'];
      
      // TypeScript should now enforce undefined checks
      expect(testArray[0]).toBe('a');
      expect(testArray[10]).toBeUndefined();
      
      // Test with type assertion for array bounds
      const safeGet = <T>(arr: T[], index: number): T | undefined => {
        return arr[index];
      };
      
      expect(safeGet(testArray, 0)).toBe('a');
      expect(safeGet(testArray, 10)).toBeUndefined();
    });

    test('should enforce exact optional properties', () => {
      interface StrictInterface {
        required: string;
        optional?: number | undefined;  // explicitly include undefined
      }

      const processStrictInterface = (obj: StrictInterface): boolean => {
        // TypeScript should enforce proper undefined handling
        if (obj.optional !== undefined) {
          return obj.optional > 0;
        }
        return true;
      };

      expect(processStrictInterface({ required: 'test' })).toBe(true);
      expect(processStrictInterface({ required: 'test', optional: 5 })).toBe(true);
      expect(processStrictInterface({ required: 'test', optional: -1 })).toBe(false);
    });
  });
});