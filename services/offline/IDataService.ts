export interface IDataService {
     getServicos(): Promise<any[]>;
     getEquipes(): Promise<any[]>;
     getGrupoItens(): Promise<any[]>;
     updateServico(id: number, data: any): Promise<void>;
     createGIServico(data: any): Promise<any>;
     updateGIServico(id: number, data: any): Promise<any>;
     getServicoHeader(servicoId: number): Promise<any>;
     createServicoHeader(header: any): Promise<any>;
     updateServicoHeader(servicoId: number, header: any): Promise<any>;
     getGIServicosByServico(servicoId: number): Promise<any[]>;
   }
