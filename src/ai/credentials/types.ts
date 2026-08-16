export type CredentialPersistence = 'session' | 'remember'

export type StoredCredential = {
  apiKey: string
  persistence: CredentialPersistence
}

export interface CredentialStore {
  get(providerProfileId: string): Promise<StoredCredential | null>
  set(
    providerProfileId: string,
    apiKey: string,
    persistence: CredentialPersistence,
  ): Promise<void>
  clear(providerProfileId: string): Promise<void>
  has(providerProfileId: string): Promise<boolean>
}
