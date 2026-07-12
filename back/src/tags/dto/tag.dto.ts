import { ApiProperty } from '@nestjs/swagger';

export class TagSummaryDto {
  @ApiProperty()
  label!: string;

  @ApiProperty()
  count!: number;
}
