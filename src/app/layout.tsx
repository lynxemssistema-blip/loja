import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Parceiro Lynx | Painel Gerencial Asaas & Split de Parceiros",
  description:
    "Painel de transparência financeira total por Grupo de Clientes Asaas, apuração de impostos, custos operacionais e divisão líquida (Split Payment) para parceiros.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-sky-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

