// Pre-commit: só o que foi alterado. O CI repete tudo; aqui o objetivo é não deixar sujeira entrar.
export default {
  '{src,tests,supabase/functions/_shared/dominio}/**/*.{ts,tsx}': [
    'eslint --max-warnings 0 --fix',
    'prettier --write',
  ],
  '*.{ts,js,mjs}': ['eslint --max-warnings 0 --fix', 'prettier --write'],
  '**/*.{json,jsonc,yml,yaml,css,html}': ['prettier --write'],
  // `tsc` precisa do projeto inteiro: a função ignora a lista de arquivos.
  '**/*.{ts,tsx}': () => 'tsc --noEmit',
};
