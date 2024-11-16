import '@src/Popup.css';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { useState } from 'react';
import type { ComponentPropsWithoutRef } from 'react';

const notificationOptions = {
  type: 'basic',
  iconUrl: chrome.runtime.getURL('icon-34.png'),
  title: 'Injecting content script error',
  message: 'You cannot inject script here!',
} as const;

const Popup = () => {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';
  const logo = isLight ? 'popup/logo_vertical.svg' : 'popup/logo_vertical_dark.svg';

  // State for input and output text
  const [inputText, setInputText] = useState('');
  const [summary, setSummary] = useState('');

  const summarizeText = async (text: string) => {
    try {
      const canSummarize = await ai.summarizer.capabilities();
      let summarizer;

      if (canSummarize && canSummarize.available !== 'no') {
        if (canSummarize.available === 'readily') {
          // The summarizer can immediately be used.
          summarizer = await ai.summarizer.create();
        } else {
          // The summarizer can be used after the model download.
          summarizer = await ai.summarizer.create();
          summarizer.addEventListener('downloadprogress', e => {
            console.log(e.loaded, e.total);
          });
          await summarizer.ready;
        }
        console.log('Summarizer is available!');
        const result = await summarizer.summarize(text);
        return result;
      } else {
        throw new Error('Summarization API not available');
      }
      // Ensure chrome.summarization is available
      // if (chrome.summarization) {
      //   const result = await chrome.summarization.summarize({ text });
      //   return result;
      // } else {
      //   throw new Error('Summarization API not available');
      // }
    } catch (error) {
      console.error('Error summarizing text:', error);
      return 'Error summarizing text.';
    }
  };

  const goGithubSite = () => chrome.tabs.create({ url: '#' });

  const injectContentScript = async () => {
    const [tab] = await chrome.tabs.query({ currentWindow: true, active: true });

    if (tab?.url?.startsWith('about:') || tab?.url?.startsWith('chrome:')) {
      chrome.notifications.create('inject-error', notificationOptions);
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab?.id! },
        files: ['/content-runtime/index.iife.js'],
      });
    } catch (err) {
      if (err.message.includes('Cannot access a chrome:// URL')) {
        chrome.notifications.create('inject-error', notificationOptions);
      }
    }
  };

  const handleSummarizeClick = async () => {
    const result = await summarizeText(inputText);
    setSummary(result);
  };

  return (
    <div className={`App ${isLight ? 'bg-slate-50' : 'bg-gray-800'}`}>
      <header className={`App-header ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
        <button onClick={goGithubSite}>
          <img src={chrome.runtime.getURL(logo)} className="App-logo" alt="logo" />
        </button>
        <h1>Summarizer</h1>
        <textarea
          id="inputText"
          rows={10}
          cols={50}
          placeholder="Enter text..."
          value={inputText}
          onChange={e => setInputText(e.target.value)}
        />
        <button id="summarizeBtn" onClick={handleSummarizeClick}>
          Summarize
        </button>
        <p id="outputText">{summary}</p>
        <p>
          Edit <code>pages/popup/src/Popup.tsx</code>
        </p>
        <button
          className={
            'font-bold mt-4 py-1 px-4 rounded shadow hover:scale-105 ' +
            (isLight ? 'bg-blue-200 text-black' : 'bg-gray-700 text-white')
          }
          onClick={injectContentScript}>
          Click to inject Content Script
        </button>
        <ToggleButton>Toggle theme</ToggleButton>
      </header>
    </div>
  );
};

const ToggleButton = (props: ComponentPropsWithoutRef<'button'>) => {
  const theme = useStorage(exampleThemeStorage);
  return (
    <button
      className={
        props.className +
        ' ' +
        'font-bold mt-4 py-1 px-4 rounded shadow hover:scale-105 ' +
        (theme === 'light' ? 'bg-white text-black shadow-black' : 'bg-black text-white')
      }
      onClick={exampleThemeStorage.toggle}>
      {props.children}
    </button>
  );
};

export default withErrorBoundary(withSuspense(Popup, <div> Loading ... </div>), <div> Error Occur </div>);
