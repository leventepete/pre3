let adatok = [];
let altAdatok = [];
let printers = [];
let currentAltNumber = null;

// Betöltési animáció mutatása
document.getElementById("loadingBarWrapper").style.display = "block";

// Debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Adatok betöltése
Promise.all([
  fetch('adatok.csv').then(response => response.text()),
  fetch('alt.csv').then(response => response.text()),
  fetch('printers.json').then(response => response.json())
])
.then(([adatokText, altText, printersData]) => {
  // Betöltés animáció elrejtése
  document.getElementById("loadingBarWrapper").style.display = "none";

  // Adatok CSV feldolgozása
  const sorok = adatokText.trim().split('\n');
  const elsoSor = sorok[0];
  const szeparator = elsoSor.includes(';') ? ';' : ',';
  const fejlec = sorok.shift().split(szeparator);

  adatok = sorok.map(sor => {
    const oszlopok = sor.split(szeparator);
    return {
      cikkszam: oszlopok[0]?.trim(),
      ean: oszlopok[1]?.trim().replace(/^'/, ''),
      vendor: oszlopok[2]?.trim(),
      gyartoi: oszlopok[3]?.trim(),
      lokacio: oszlopok[4]?.trim(),
      check: oszlopok[5]?.trim(),
      db: oszlopok[6]?.trim()
    };
  });

  console.log(`✅ CSV adatok betöltve (${szeparator} szeparátorral):`, adatok);

  // ALT CSV feldolgozása
  const altSorok = altText.trim().split('\n');
  const altElsoSor = altSorok[0];
  const altSzeparator = altElsoSor.includes(';') ? ';' : ',';
  const altFejlec = altSorok.shift().split(altSzeparator);

  altAdatok = altSorok.map(sor => {
    const oszlopok = sor.split(altSzeparator);
    return {
      mother: oszlopok[0]?.trim(),
      alt: oszlopok[1]?.trim(),
      dep: oszlopok[2]?.trim(),
      desc: oszlopok[3]?.trim(),
      searchName: oszlopok[4]?.trim()
    };
  });

  console.log(`✅ ALT CSV adatok betöltve (${altSzeparator} szeparátorral):`, altAdatok);

  // Nyomtatók betöltése
  printers = printersData;
  console.log("✅ Nyomtatók betöltve:", printers);

  // Nyomtatók listájának feltöltése
  const printerSelect = document.getElementById('printer-select');
  printers.forEach(printer => {
    const option = document.createElement('option');
    option.value = printer.ip;
    option.textContent = printer.name;
    printerSelect.appendChild(option);
  });
})
.catch(err => {
  document.getElementById("loadingBarWrapper").style.display = "none";
  console.error('❌ Hiba történt az adatok beolvasásakor:', err);
});

document.addEventListener("DOMContentLoaded", () => {
  const kereso = document.getElementById('kereso');
  const eredmenyDiv = document.getElementById('eredmeny');
  const naploTablaBody = document.querySelector("#naploTabla tbody");
  const masolasGomb = document.getElementById("masolasGomb");

  // Add clear button to search input
  const clearButton = document.getElementById('torles-gomb');
  
  function keres(keresett) {
    const tisztitott = keresett.trim().toLowerCase();
    eredmenyDiv.innerHTML = '';
    clearButton.style.display = tisztitott ? 'block' : 'none';

    if (!tisztitott) {
      eredmenyDiv.innerHTML = '<div class="no-results">Írj be egy kódot a kereséshez...</div>';
      return;
    }

    // Szűrjük az adatokból azokat, amelyeknek a cikkszám vagy EAN vagy gyártói cikkszám egyezik a keresett szöveggel
    const talalatok = adatok.filter(a =>
      a.cikkszam?.toLowerCase() === tisztitott ||
      a.ean?.toLowerCase() === tisztitott ||
      a.gyartoi?.toLowerCase() === tisztitott
    );

    if (talalatok.length > 0) {
      // Eredmények megjelenítése
      talalatok.forEach(talalat => {
        let lokacioImage = '';
        switch (talalat.lokacio.toUpperCase()) {
          case 'KEZIPOLC':
            lokacioImage = 'kezipolc.png';
            break;
          case 'AUTOSTOREULLO':
            lokacioImage = 'autostore.png';
            break;
        }

        const div = document.createElement('div');
        div.className = 'talalat-blokk';
        div.innerHTML = `
          <div class="talalat-adatok">
            <p><strong>🔢 Cikkszám:</strong> ${talalat.cikkszam}</p>
            <p><strong>📦 EAN:</strong> ${talalat.ean}</p>
            <p><strong>🏷️ Gyártói cikkszám:</strong> ${talalat.gyartoi}</p>
            <p><strong>📍 Lokáció:</strong> ${talalat.lokacio}</p>
            ${talalat.db ? `<p><strong>📋 Db info:</strong> ${talalat.db}</p>` : ''}
          </div>
          ${lokacioImage ? `
            <div class="lokacio-kep-wrapper">
              <img src="${lokacioImage}" alt="${talalat.lokacio}" class="lokacio-kep" loading="lazy" />
            </div>
          ` : ''}
        `;
        eredmenyDiv.appendChild(div);
      });

      // Csak az első találatot naplózzuk
      const elsoTalalat = talalatok[0];
      const sor = document.createElement("tr");
      sor.innerHTML = `
        <td>${elsoTalalat.cikkszam}</td>
        <td>${elsoTalalat.gyartoi}</td>
        <td>${elsoTalalat.lokacio}</td>
        <td><input type="number" min="1" value="1" class="db-input"></td>
        <td><button class="delete-btn">X</button></td>
      `;
      
      // Törlés gomb eseménykezelő
      const deleteBtn = sor.querySelector('.delete-btn');
      deleteBtn.addEventListener('click', function() {
        sor.remove();
      });
      
      naploTablaBody.insertBefore(sor, naploTablaBody.firstChild);
    } else {
      const eanTalalat = adatok.find(a => a.ean?.toLowerCase() === tisztitott);
      if (eanTalalat) {
        const div = document.createElement('div');
        div.className = 'talalat-blokk';
        div.innerHTML = `
          <div class="talalat-adatok">
            <p><strong>📦 EAN:</strong> ${eanTalalat.ean}</p>
            <p><strong>❗ Nem található cikkszám alapján.</strong></p>
            <p><strong>📋 Db info:</strong> ${eanTalalat.db}</p>
          </div>
        `;
        eredmenyDiv.appendChild(div);
      } else {
        eredmenyDiv.innerHTML = '<div class="no-results">❌ Nincs találat.</div>';
      }
    }
  }

  const debouncedKeres = debounce((value) => keres(value), 300);
  kereso.addEventListener('input', (e) => debouncedKeres(e.target.value));

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'k') {
      e.preventDefault();
      kereso.focus();
    }
    if (e.ctrlKey && e.key === 'm') {
      e.preventDefault();
      masolasGomb.click();
    }
  });

  clearButton.addEventListener('click', () => {
    kereso.value = '';
    eredmenyDiv.innerHTML = '<div class="no-results">Írj be egy kódot a kereséshez...</div>';
    clearButton.style.display = 'none';
    kereso.focus();
  });

  masolasGomb.addEventListener("click", () => {
    let szoveg = "Cikkszám\tGyártói\tLokáció\tDb\n";
    const sorok = naploTablaBody.querySelectorAll("tr");

    if (sorok.length === 0) {
      alert("Nincs másolható adat a naplóban.");
      return;
    }

    sorok.forEach((sor) => {
      const cellak = sor.querySelectorAll("td");
      const cikkszam = cellak[0].innerText;
      const gyartoi = cellak[1].innerText;
      const lokacio = cellak[2].innerText;
      const dbInput = cellak[3].querySelector("input");
      const db = dbInput ? dbInput.value : '1';

      szoveg += `${cikkszam}\t${gyartoi}\t${lokacio}\t${db}\n`;
    });

    navigator.clipboard.writeText(szoveg).then(() => {
      alert("📋 Napló vágólapra másolva.");
    }).catch((err) => {
      console.error("❌ Másolási hiba:", err);
      alert("❌ Hiba történt a vágólapra másolás során.");
    });
  });

  // ALT/DEP keresés
  const altdepKereso = document.getElementById('altdep-kereso');
  const altdepEredmenyDiv = document.getElementById('altdep-eredmeny');
  const altdepTorlesGomb = document.getElementById('altdep-torles-gomb');
  const printBarcodeButton = document.getElementById('print-barcode-button');
  const printerSelect = document.getElementById('printer-select');
  const printStatus = document.getElementById('print-status');
  const barcodeElement = document.getElementById('barcode');

  function keresAltDep(keresett) {
    const tisztitott = keresett.trim().toLowerCase();
    altdepEredmenyDiv.innerHTML = '';
    altdepTorlesGomb.style.display = tisztitott ? 'block' : 'none';
    currentAltNumber = null;
    printBarcodeButton.disabled = true;

    if (!tisztitott) {
      altdepEredmenyDiv.innerHTML = '<div class="no-results">Írj be egy kódot a kereséshez...</div>';
      return;
    }

    // Keresés az altAdatok-ban
    const talalatok = altAdatok.filter(a =>
      a.mother?.toLowerCase().includes(tisztitott) ||
      a.alt?.toLowerCase().includes(tisztitott) ||
      a.dep?.toLowerCase().includes(tisztitott) ||
      a.desc?.toLowerCase().includes(tisztitott) ||
      a.searchName?.toLowerCase().includes(tisztitott)
    );

    if (talalatok.length > 0) {
      talalatok.forEach(talalat => {
        const div = document.createElement('div');
        div.className = 'talalat-blokk';
        div.innerHTML = `
          <div class="talalat-adatok">
            <p><strong>🔢 Fő cikkszám:</strong> ${talalat.mother}</p>
            <p><strong>🔄 ALT cikkszám:</strong> ${talalat.alt}</p>
            <p><strong>🔗 DEP cikkszám:</strong> ${talalat.dep}</p>
            <p><strong>📝 Leírás:</strong> ${talalat.desc}</p>
            <p><strong>🔍 Keresőnév:</strong> ${talalat.searchName}</p>
          </div>
        `;
        altdepEredmenyDiv.appendChild(div);
      });

      // Az első találat ALT cikkszámát használjuk a vonalkódhoz
      currentAltNumber = talalatok[0].alt;
      
      // Vonalkód generálása
      if (currentAltNumber) {
        JsBarcode("#barcode", currentAltNumber, {
          format: "CODE128",
          width: 2,
          height: 100,
          displayValue: true,
          fontSize: 18,
          margin: 10
        });
        printBarcodeButton.disabled = false;
      }
    } else {
      altdepEredmenyDiv.innerHTML = '<div class="no-results">❌ Nincs találat.</div>';
    }
  }

  const debouncedKeresAltDep = debounce((value) => keresAltDep(value), 300);
  
  if (altdepKereso) {
    altdepKereso.addEventListener('input', (e) => debouncedKeresAltDep(e.target.value));
  }

  if (altdepTorlesGomb) {
    altdepTorlesGomb.addEventListener('click', () => {
      altdepKereso.value = '';
      altdepEredmenyDiv.innerHTML = '<div class="no-results">Írj be egy kódot a kereséshez...</div>';
      altdepTorlesGomb.style.display = 'none';
      currentAltNumber = null;
      printBarcodeButton.disabled = true;
      barcodeElement.innerHTML = '';
      altdepKereso.focus();
    });
  }

  // Nyomtatás kezelése
  if (printBarcodeButton && printerSelect) {
    printerSelect.addEventListener('change', () => {
      printBarcodeButton.disabled = !printerSelect.value || !currentAltNumber;
    });

    printBarcodeButton.addEventListener('click', () => {
      const printerIp = printerSelect.value;
      
      if (!printerIp) {
        printStatus.innerHTML = '<p style="color: #ff6600;">Válassz nyomtatót!</p>';
        return;
      }

      if (!currentAltNumber) {
        printStatus.innerHTML = '<p style="color: #ff6600;">Nincs kiválasztott cikkszám!</p>';
        return;
      }

      printStatus.innerHTML = '<p style="color: #ffcc00;">Nyomtatás folyamatban...</p>';

      // Vonalkód nyomtatása a szerveren keresztül
      fetch('http://localhost:3000/print-barcode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articleNumber: currentAltNumber,
          printerIp: printerIp
        }),
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          printStatus.innerHTML = '<p style="color: #00cc00;">Nyomtatás sikeres! ✓</p>';
        } else {
          printStatus.innerHTML = `<p style="color: #ff0000;">Hiba történt: ${data.error}</p>`;
        }
      })
      .catch(error => {
        console.error('Nyomtatási hiba:', error);
        printStatus.innerHTML = '<p style="color: #ff0000;">Kapcsolódási hiba a szerverhez!</p>';
      });
    });
  }

  // Tab kezelés
  const tabLinks = document.querySelectorAll('.nav-tabs a');
  const tabContents = document.querySelectorAll('.tab-content');

  tabLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Aktív tab link eltávolítása
      tabLinks.forEach(l => l.classList.remove('active'));
      
      // Aktív tab tartalom elrejtése
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Kiválasztott tab aktiválása
      link.classList.add('active');
      const targetId = link.getAttribute('href');
      document.querySelector(targetId).classList.add('active');
    });
  });
});