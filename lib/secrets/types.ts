export interface SecretDef {
  id: string;
  title: string;
  hint: string;
  /** false = listed in the catalogue but not yet discoverable in this build */
  implemented: boolean;
  category?: string;
}
export interface MachineSecretCatalog {
  machineId: string;
  secrets: SecretDef[];
}
