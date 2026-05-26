"use client";

import ReactFlagsSelect from "react-flags-select";
import { useI18n } from "@/i18n/I18nProvider";

type CountrySelectorProps = {
  value: string;
  onChange: (countryCode: string) => void;
  disabled?: boolean;
  id?: string;
};

export function CountrySelector({ value, onChange, disabled, id }: CountrySelectorProps) {
  const { t } = useI18n();

  return (
    <div className="country-selector">
      <ReactFlagsSelect
        id={id}
        selected={value}
        onSelect={onChange}
        searchable
        searchPlaceholder={t.countrySelector.searchPlaceholder}
        placeholder={t.countrySelector.placeholder}
        fullWidth
        disabled={disabled}
        showSecondarySelectedLabel={false}
        showSecondaryOptionLabel={false}
        selectButtonClassName="country-selector-trigger"
      />
    </div>
  );
}
