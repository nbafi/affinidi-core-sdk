import { IPlatformEncryptionTools } from '../../src/shared/interfaces'

export const testPlatformTools: IPlatformEncryptionTools = {
  platformName: 'stub',
  // eslint-disable-next-line no-unused-vars
  decryptByPrivateKey: async (_privateKeyBuffer: Buffer, data: string) => {
    return JSON.parse(data)
  },
  // eslint-disable-next-line no-unused-vars
  encryptByPublicKey: async (_publicKeyBuffer: Buffer, data: unknown) => {
    const dataString = JSON.stringify(data)
    return dataString
  },
  // eslint-disable-next-line no-unused-vars
  computePersonalHash: async (_privateKeyBuffer: Buffer, data: string) => {
    return data
  },
}
