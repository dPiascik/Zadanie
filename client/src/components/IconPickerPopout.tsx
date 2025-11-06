import React from 'react';

interface IconPickerProps {
  selectedIcon: string;
  setSelectedIcon: (icon: string) => void;
}

export const IconPickerPopout: React.FC<IconPickerProps> = ({ selectedIcon, setSelectedIcon }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const icons = [
    { src: "/fastRaceCar.svg", label: "Samochód 1" },
    { src: "/fastRaceCarOrange.svg", label: "Samochód 2" },
    { src: "/fastRaceCarPurple.svg", label: "Samochód 3" },
  ];

  const handleClick = (iconSrc: string) => {
    setSelectedIcon(iconSrc);
    setIsOpen(false);
  };

  return (
    <div className='icon-picker-container'>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', cursor: 'pointer' }}
      >
        <img src={selectedIcon} alt="Wybrany samochód" className='icon-picker-selected' />
        Wybierz samochód
      </button>

      {isOpen && (
        <div className='icon-picker-popout'>
          {icons.map(icon => (
            <img
              key={icon.src}
              src={icon.src}
              alt={icon.label}
              onClick={() => handleClick(icon.src)}
              className={`icon-picker-item ${selectedIcon === icon.src ? 'selected' : ''}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
