import { createBrowserRouter } from 'react-router-dom';
import { MainLayout } from '@components/layouts/MainLayout';
import { HomePage } from '@pages/Home/HomePage';
import { ProcessesPage } from '@pages/Processes/ProcessesPage';
import { ProcessDefinitionDetailPage } from '@pages/ProcessDefinitionDetail';
import { ProcessInstanceDetailPage } from '@pages/ProcessInstanceDetail';
import { DesignPage } from '@pages/Design';
import { ProcessDesignerPage } from '@pages/ProcessDesigner';
import { DecisionDesignerPage } from '@pages/DecisionDesigner';
import { DecisionsPage } from '@pages/Decisions/DecisionsPage';
import { DecisionDefinitionDetailPage } from '@pages/DecisionDefinitionDetail';
import { DecisionInstanceDetailPage } from '@pages/DecisionInstanceDetail';


export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'processes',
        element: <ProcessesPage />,
        children: [
          {
            index: true,
            element: null, // Redirect handled in ProcessesPage
          },
          {
            path: ':tab',
            element: null, // Tab content handled in ProcessesPage
          },
        ],
      },
      {
        path: 'process-definitions/:processDefinitionKey',
        element: <ProcessDefinitionDetailPage />,
      },
      {
        path: 'process-instances/:processInstanceKey',
        element: <ProcessInstanceDetailPage />,
      },
      {
        path: 'decisions',
        element: <DecisionsPage />,
        children: [
          {
            index: true,
            element: null, // Redirect handled in DecisionsPage
          },
          {
            path: ':tab',
            element: null, // Tab content handled in DecisionsPage
          },
        ],
      },
      {
        path: 'decision-definitions/:dmnResourceDefinitionKey',
        element: <DecisionDefinitionDetailPage />,
      },
      {
        path: 'decision-instances/:decisionInstanceKey',
        element: <DecisionInstanceDetailPage />,
      },
      {
        path: 'designer',
        element: <DesignPage />,
      },
      {
        path: 'designer/process',
        element: <ProcessDesignerPage />,
      },
      {
        path: 'designer/process/:processDefinitionKey',
        element: <ProcessDesignerPage />,
      },
      {
        path: 'designer/decision',
        element: <DecisionDesignerPage />,
      },
      {
        path: 'designer/decision/:decisionDefinitionKey',
        element: <DecisionDesignerPage />,
      },
    ],
  },
]);
