export const customSelectStyles = {
    control: (provided, state) => ({
        ...provided,
        backgroundColor: 'rgba(55, 65, 81, 0.8)',
        border: state.isFocused ? '1px solid rgba(255, 0, 0, 0.5)' : '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '8px',
        boxShadow: state.isFocused ? '0 0 15px rgba(255, 0, 0, 0.3)' : 'none',
        minHeight: '48px',
        transition: 'all 0.3s ease',
        '&:hover': {
            borderColor: 'rgba(255, 0, 0, 0.4)',
            backgroundColor: 'rgba(55, 65, 81, 0.9)',
        }
    }),
    menu: (provided) => ({
        ...provided,
        backgroundColor: 'rgba(31, 41, 55, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
        zIndex: 9999,
    }),
    menuList: (provided) => ({
        ...provided,
        padding: '8px',
        maxHeight: '200px',
        '&::-webkit-scrollbar': {
            width: '8px',
        },
        '&::-webkit-scrollbar-track': {
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb': {
            background: 'linear-gradient(180deg, #cc0000 0%, #ff0000 100%)',
            borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
            background: 'linear-gradient(180deg, #ff0000 0%, #cc0000 100%)',
        },
    }),
    option: (provided, state) => ({
        ...provided,
        backgroundColor: state.isSelected 
            ? 'rgba(255, 0, 0, 0.3)' 
            : state.isFocused 
                ? 'rgba(255, 255, 255, 0.1)' 
                : 'transparent',
        color: state.isSelected ? '#ffffff' : '#d1d5db',
        padding: '12px 16px',
        borderRadius: '6px',
        margin: '2px 0',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
            backgroundColor: state.isSelected 
                ? 'rgba(255, 0, 0, 0.4)' 
                : 'rgba(255, 255, 255, 0.15)',
        }
    }),
    singleValue: (provided) => ({
        ...provided,
        color: '#ffffff',
        fontWeight: '500',
    }),
    input: (provided) => ({
        ...provided,
        color: '#ffffff',
    }),
    placeholder: (provided) => ({
        ...provided,
        color: '#9ca3af',
        fontWeight: '400',
    }),
    indicatorSeparator: (provided) => ({
        ...provided,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    }),
    dropdownIndicator: (provided, state) => ({
        ...provided,
        color: state.isFocused ? '#ff0000' : 'rgba(255, 255, 255, 0.6)',
        transition: 'all 0.2s ease',
        '&:hover': {
            color: '#ff0000',
        }
    }),
    clearIndicator: (provided) => ({
        ...provided,
        color: 'rgba(255, 255, 255, 0.6)',
        '&:hover': {
            color: '#ff0000',
        }
    }),
    multiValue: (provided) => ({
        ...provided,
        backgroundColor: 'rgba(255, 0, 0, 0.2)',
        border: '1px solid rgba(255, 0, 0, 0.3)',
    }),
    multiValueLabel: (provided) => ({
        ...provided,
        color: '#ffffff',
    }),
    multiValueRemove: (provided) => ({
        ...provided,
        color: 'rgba(255, 255, 255, 0.6)',
        '&:hover': {
            backgroundColor: 'rgba(255, 0, 0, 0.4)',
            color: '#ffffff',
        }
    }),
};
