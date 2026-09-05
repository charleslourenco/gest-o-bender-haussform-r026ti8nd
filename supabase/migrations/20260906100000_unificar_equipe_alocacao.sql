-- Migração para unificação de equipe nos kanbans (Produção e Montagem)
-- Suporta alocação de pessoas CLT (equipe_clt) e PJ (parceiros_pj)
-- Preserva histórico existente em alocacao_montagem e historico_alocacao_montagem

-- 1. Sincronizar montadores existentes em parceiros_pj ou equipe_clt caso ainda não existam
DO $$
DECLARE
    m RECORD;
BEGIN
    FOR m IN SELECT * FROM montadores LOOP
        IF NOT EXISTS (
            SELECT 1 FROM parceiros_pj WHERE razao_social ILIKE m.nome_completo OR socio_nome ILIKE m.nome_completo
        ) AND NOT EXISTS (
            SELECT 1 FROM equipe_clt WHERE nome_completo ILIKE m.nome_completo
        ) THEN
            INSERT INTO parceiros_pj (razao_social, socio_nome, telefone, criado_em, atualizado_em)
            VALUES (m.nome_completo, m.nome_completo, COALESCE(m.telefone, ''), NOW(), NOW());
        END IF;
    END LOOP;
END $$;

-- 2. Permitir que alocacao_montagem armazene tipo_origem ('CLT' ou 'PJ') e pessoa_id (UUID do equipe_clt ou parceiros_pj)
ALTER TABLE alocacao_montagem ALTER COLUMN montador_id DROP NOT NULL;

ALTER TABLE alocacao_montagem ADD COLUMN IF NOT EXISTS tipo_origem VARCHAR(10) DEFAULT 'PJ' CHECK (tipo_origem IN ('CLT', 'PJ'));
ALTER TABLE alocacao_montagem ADD COLUMN IF NOT EXISTS pessoa_id UUID;
ALTER TABLE alocacao_montagem ADD COLUMN IF NOT EXISTS pessoa_nome TEXT;

-- Preencher pessoa_id e pessoa_nome para alocações existentes baseando-se em montador_id
DO $$
DECLARE
    rec RECORD;
    pj_id UUID;
    clt_id UUID;
BEGIN
    FOR rec IN SELECT am.id, am.montador_id, m.nome_completo FROM alocacao_montagem am JOIN montadores m ON m.id = am.montador_id WHERE am.pessoa_id IS NULL LOOP
        -- Tenta achar em parceiros_pj
        SELECT id INTO pj_id FROM parceiros_pj WHERE razao_social ILIKE rec.nome_completo OR socio_nome ILIKE rec.nome_completo LIMIT 1;
        IF pj_id IS NOT NULL THEN
            UPDATE alocacao_montagem SET tipo_origem = 'PJ', pessoa_id = pj_id, pessoa_nome = rec.nome_completo WHERE id = rec.id;
        ELSE
            -- Tenta achar em equipe_clt
            SELECT id INTO clt_id FROM equipe_clt WHERE nome_completo ILIKE rec.nome_completo LIMIT 1;
            IF clt_id IS NOT NULL THEN
                UPDATE alocacao_montagem SET tipo_origem = 'CLT', pessoa_id = clt_id, pessoa_nome = rec.nome_completo WHERE id = rec.id;
            ELSE
                UPDATE alocacao_montagem SET tipo_origem = 'PJ', pessoa_nome = rec.nome_completo WHERE id = rec.id;
            END IF;
        END IF;
    END LOOP;
END $$;

-- Atualizar índices para rápida busca por card_id e pessoa_id
CREATE INDEX IF NOT EXISTS idx_alocacao_montagem_pessoa ON alocacao_montagem(pessoa_id, tipo_origem);
CREATE INDEX IF NOT EXISTS idx_alocacao_montagem_card ON alocacao_montagem(card_id);

-- Ajustar historico_alocacao_montagem para suportar pessoa_id e tipo_origem
ALTER TABLE historico_alocacao_montagem ALTER COLUMN montador_id DROP NOT NULL;
ALTER TABLE historico_alocacao_montagem ADD COLUMN IF NOT EXISTS tipo_origem VARCHAR(10) DEFAULT 'PJ';
ALTER TABLE historico_alocacao_montagem ADD COLUMN IF NOT EXISTS pessoa_id UUID;
ALTER TABLE historico_alocacao_montagem ADD COLUMN IF NOT EXISTS pessoa_nome TEXT;

-- Atualizar triggers de historico_alocacao_montagem para não falhar se montador_id for nulo ou se usar pessoa_id
CREATE OR REPLACE FUNCTION log_alocacao_montagem_insert()
RETURNS TRIGGER AS $$
DECLARE
    m_nome TEXT;
BEGIN
    IF NEW.pessoa_nome IS NOT NULL THEN
        m_nome := NEW.pessoa_nome;
    ELSIF NEW.montador_id IS NOT NULL THEN
        SELECT nome_completo INTO m_nome FROM montadores WHERE id = NEW.montador_id;
    END IF;

    INSERT INTO historico_alocacao_montagem (
        card_id,
        montador_id,
        acao,
        criado_em,
        tipo_origem,
        pessoa_id,
        pessoa_nome
    ) VALUES (
        NEW.card_id,
        NEW.montador_id,
        'alocado',
        NOW(),
        COALESCE(NEW.tipo_origem, 'PJ'),
        NEW.pessoa_id,
        m_nome
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION log_alocacao_montagem_delete()
RETURNS TRIGGER AS $$
DECLARE
    m_nome TEXT;
BEGIN
    IF OLD.pessoa_nome IS NOT NULL THEN
        m_nome := OLD.pessoa_nome;
    ELSIF OLD.montador_id IS NOT NULL THEN
        SELECT nome_completo INTO m_nome FROM montadores WHERE id = OLD.montador_id;
    END IF;

    INSERT INTO historico_alocacao_montagem (
        card_id,
        montador_id,
        acao,
        criado_em,
        tipo_origem,
        pessoa_id,
        pessoa_nome
    ) VALUES (
        OLD.card_id,
        OLD.montador_id,
        'desalocado',
        NOW(),
        COALESCE(OLD.tipo_origem, 'PJ'),
        OLD.pessoa_id,
        m_nome
    );
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
