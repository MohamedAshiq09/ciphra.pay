import { IsString, IsNotEmpty, IsEnum } from 'class-validator';

export enum HashAlgorithm {
  SHA256 = 'sha256',
  POSEIDON = 'poseidon',
  PEDERSEN = 'pedersen',
}

export class GenerateSecretDto {
  @IsNotEmpty()
  length?: number = 32;
}

export class ComputeHashDto {
  @IsString()
  @IsNotEmpty()
  secret: string;

  @IsEnum(HashAlgorithm)
  algorithm: HashAlgorithm;
}

export class VerifySecretDto {
  @IsString()
  @IsNotEmpty()
  secret: string;

  @IsString()
  @IsNotEmpty()
  hashLock: string;

  @IsEnum(HashAlgorithm)
  algorithm: HashAlgorithm;
}

export class HashConversionDto {
  @IsString()
  @IsNotEmpty()
  secret: string;
}

export interface SecretHashes {
  secret: string;
  sha256: string;
  poseidon: string;
  pedersen: string;
}
