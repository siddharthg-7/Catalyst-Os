export interface LegalAuditInput {
  agreementName: string;
  terms: string;
}

export interface LegalAuditOutput {
  vetted: boolean;
  identifiedRisks: string[];
  suggestedRevisions: string;
}
