import { useTranslation } from 'react-i18next'

import {
  ALIGN_CENTER,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_FLEX_END,
  LegacyStyledText,
  Link,
  Modal,
  PrimaryButton,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'

import type { DuplicateLabwareFile } from '/app/redux/custom-labware/types'

interface ConfirmOverwriteLabwareModalProps {
  duplicateFile: DuplicateLabwareFile
  onCancel: () => void
  onConfirmOverwrite: () => void
}

export function ConfirmOverwriteLabwareModal(
  props: ConfirmOverwriteLabwareModalProps
): JSX.Element {
  const { duplicateFile, onCancel, onConfirmOverwrite } = props
  const { t } = useTranslation(['labware_landing', 'shared'])
  const filename = duplicateFile.filename.split(/[\\/]/).pop()

  return (
    <Modal
      type="warning"
      onClose={onCancel}
      title={t('labware_def_already_exists')}
    >
      <Flex flexDirection={DIRECTION_COLUMN}>
        <LegacyStyledText forwardedAs="p" marginBottom={SPACING.spacing24}>
          {t('overwrite_labware_body', { filename })}
        </LegacyStyledText>
        <Flex justifyContent={JUSTIFY_FLEX_END} alignItems={ALIGN_CENTER}>
          <Link
            role="button"
            onClick={onCancel}
            textTransform={TYPOGRAPHY.textTransformCapitalize}
            marginRight={SPACING.spacing24}
            css={TYPOGRAPHY.linkPSemiBold}
          >
            {t('shared:cancel')}
          </Link>
          <PrimaryButton variant="warning" onClick={onConfirmOverwrite}>
            {t('replace_definition')}
          </PrimaryButton>
        </Flex>
      </Flex>
    </Modal>
  )
}
