export interface IDataService {
     getServicos(): Promise<any[]>;
     getEquipes(): Promise<any[]>;
     getGrupoItens(): Promise<any[]>;
     updateServico(id: string, data: any): Promise<void>;
     createGiServico(data: any): Promise<void>;
     // ... outras operações
   }