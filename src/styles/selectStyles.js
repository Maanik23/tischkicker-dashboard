export const customSelectStyles = {
    control: (provided) => ({
        ...provided,
        backgroundColor: 'rgba(0,0,0,0.2)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '0.5rem',
        minHeight: '48px',
        color: '#fff',
    }),
    menu: (provided) => ({
        ...provided,
        backgroundColor: '#1c1c1c',
        border: '1px solid rgba(255,255,255,0.2)',
    }),
    option: (provided, { isSelected, isFocused }) => ({
        ...provided,
        backgroundColor: isSelected ? 'rgba(234,88,12,0.5)' : isFocused ? 'rgba(255,255,255,0.1)' : 'transparent',
        color: '#fff',
    }),
    singleValue: (provided) => ({
        ...provided,
        color: '#fff',
    }),
    input: (provided) => ({
        ...provided,
        color: '#fff',
    }),
    multiValue: (styles) => {
        return {
          ...styles,
          backgroundColor: 'rgba(234,88,12,0.2)',
        };
      },
      multiValueLabel: (styles) => ({
        ...styles,
        color: '#fff',
      }),
      multiValueRemove: (styles) => ({
        ...styles,
        color: '#fff',
        ':hover': {
          backgroundColor: 'rgba(234,88,12,0.5)',
          color: 'white',
        },
      }),
};
