const CPF_LENGTH = 11;

export function normalizeCpf(value: string): string {
  return value.replace(/\D/g, "");
}

function verifierDigit(base: string, initialWeight: number): number {
  const sum = [...base].reduce(
    (total, digit, index) => total + Number(digit) * (initialWeight - index),
    0,
  );
  const remainder = (sum * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}

export function isValidCpf(value: string): boolean {
  const cpf = normalizeCpf(value);
  if (cpf.length !== CPF_LENGTH || /^(\d)\1{10}$/.test(cpf)) return false;
  const first = verifierDigit(cpf.slice(0, 9), 10);
  const second = verifierDigit(`${cpf.slice(0, 9)}${first}`, 11);
  return cpf.endsWith(`${first}${second}`);
}

export function formatCpf(value: string): string {
  const cpf = normalizeCpf(value).slice(0, CPF_LENGTH);
  return cpf
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}
