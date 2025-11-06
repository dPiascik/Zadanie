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
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', cursor: 'pointer' }}
      >
        <img src={selectedIcon} alt="Wybrany samochód" style={{ width: '30px' }} />
        Wybierz samochód
      </button>

      {isOpen && (
        <div>
          {icons.map(icon => (
            <img
              key={icon.src}
              src={icon.src}
              alt={icon.label}
              onClick={() => handleClick(icon.src)}
              style={{ width: '50px', height: '50px', cursor: 'pointer', border: selectedIcon === icon.src ? '2px solid blue' : '2px solid transparent', borderRadius: '8px', }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
