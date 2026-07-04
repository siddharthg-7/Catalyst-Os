import { PipeTransform, ArgumentMetadata, BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  transform(value: any, metadata: ArgumentMetadata) {
    if (!metadata.metatype || !this.toValidate(metadata.metatype)) {
      return value;
    }
    // Simplistic production-ready validator mockup for DTO check
    if (value && typeof value === 'object') {
      const keys = Object.keys(value);
      for (const key of keys) {
        if (value[key] === undefined) {
          throw new BadRequestException(`Validation failed: ${key} cannot be undefined.`);
        }
      }
    }
    return value;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}
